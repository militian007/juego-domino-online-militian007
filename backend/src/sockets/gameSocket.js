import jwt from 'jsonwebtoken';
import { HUMAN_DELAY_MS } from '../RoomManager.js';
import * as torneos from '../services/torneos.js';
import * as Sticker from '../models/Sticker.js';

const MODOS_INVITADO = ['1v1bot', '2v2bots'];

/**
 * Identidad ligera (secciones 177 y 188): el invitado juega en linea con sus
 * panas, con el nombre y el retrato que eligio en el umbral. Es la regla de la
 * casa (como en el Ludo): las cuentas las pone la plataforma despues. Lo de
 * Jonathan —"necesitas registrarte para jugar en linea"— sigue ahi con
 * `DOMINO_INVITADOS_EN_LINEA=0`.
 */
const INVITADOS_EN_LINEA = process.env.DOMINO_INVITADOS_EN_LINEA !== '0';
const RETRATOS = ['catire', 'chela', 'chuo', 'comadre', 'juana', 'musiu', 'nano', 'pancho', 'paula', 'tigre', 'yubi', 'zurda'];

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const GUEST_NAME = 'Invitado';

export function setupGameSocket(io, roomManager) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // El invitado trae su propio id, guardado en su navegador. Antes se usaba
      // `guest-${socket.id}`, que cambiaba en cada conexion: al refrescar o al
      // salir a otra app el jugador pasaba a ser "otro" y perdia su partida.
      const propio = socket.handshake.auth?.guestId;
      const valido = typeof propio === 'string' && /^guest-[a-z0-9]{6,40}$/i.test(propio);
      socket.userId = valido ? propio : `guest-${socket.id}`;
      // Identidad ligera (seccion 177): el invitado trae el nombre que eligio en
      // el umbral. Se limpia aqui: letras, numeros y espacios, de 2 a 14.
      const nombre = String(socket.handshake.auth?.guestName || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 14);
      socket.username = nombre.length >= 2 ? nombre : GUEST_NAME;
      const retrato = String(socket.handshake.auth?.guestRetrato || '');
      socket.retrato = RETRATOS.includes(retrato) ? retrato : undefined;
      socket.isGuest = true;
      return next();
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      socket.isGuest = false;
      next();
    } catch (err) {
      const reason = err?.name === 'TokenExpiredError' ? 'expirado' : 'inválido';
      const message = `Token ${reason}`;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Socket auth failed:', err?.message, 'token prefix:', String(token).slice(0, 12));
      }
      next(new Error(message));
    }
  });

  io.on('connection', (socket) => {
    const tag = socket.isGuest ? 'invitado' : 'usuario';
    console.log(`🎮 ${socket.username} (${tag}) conectado (${socket.id})`);

    socket.on('room:create', ({ mode, bot, modalidad, armada }, callback) => {
      // Los modos contra bots no exponen a nadie a otro usuario, asi que un
      // invitado puede crearlos. Los que llevan humanos piden cuenta salvo con
      // la identidad ligera encendida (seccion 188).
      if (socket.isGuest && !INVITADOS_EN_LINEA && !MODOS_INVITADO.includes(mode)) {
        return callback?.({ ok: false, error: 'Necesitas registrarte para jugar en línea' });
      }
      try {
        // El candado (seccion 191): una persona, un asiento.
        if (armada) {
          const traba = roomManager.candado(socket.userId);
          if (traba) return callback?.({ ok: false, error: traba.error, code: traba.code });
        }
        const room = roomManager.createRoom({
          mode,
          modalidad,
          hostId: socket.userId,
          hostUsername: socket.username,
          avatar: socket.retrato,
          armada: armada && typeof armada === 'object' ? armada : undefined
        });
        if (bot) room.botPreferido = bot;
        const player = room.players.find((p) => p.id === socket.userId);
        player.socketId = socket.id;
        socket.join(room.code);
        roomManager.broadcastLobby(room);
        callback?.({ ok: true, code: room.code, room: { code: room.code, mode: room.mode, modalidad: room.modalidad, modeLabel: room.config.label, hasPool: room.config.hasPool, players: room.players, started: room.started, maxPlayers: room.config.totalPlayers } });
      } catch (e) {
        callback?.({ ok: false, error: e.message });
      }
    });

    socket.on('room:join', ({ code }, callback) => {
      // Un invitado no puede entrar a una sala ajena (salvo con la identidad
      // ligera encendida), pero SI puede volver a la suya: es como vuelve
      // despues de refrescar o de salir a otra app.
      code = String(code || '').trim().toUpperCase();
      if (socket.isGuest && !INVITADOS_EN_LINEA) {
        const sala = roomManager.rooms.get(code);
        const yaEstaba = sala?.players.some((p) => p.id === socket.userId);
        if (!yaEstaba) {
          return callback?.({ ok: false, error: 'Necesitas registrarte para unirte a una partida' });
        }
      }
      // El candado (seccion 191) solo cuenta para las mesas armadas: si ya
      // estas jugando en otra, te devuelve esa.
      const destino = roomManager.rooms.get(code);
      if (destino?.armada && !destino.players.some((p) => p.id === socket.userId)) {
        const traba = roomManager.candado(socket.userId, code);
        if (traba) return callback?.({ ok: false, error: traba.error, code: traba.code });
      }
      const result = roomManager.joinRoom(code, {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
        avatar: socket.retrato
      });
      if (result.error) return callback?.({ ok: false, error: result.error });
      socket.join(code);
      const room = result.room;
      const me = room.players.find((p) => p.id === socket.userId);
      me.socketId = socket.id;
      // Volvio antes de que se le acabaran los 60 segundos: se corta la cuenta
      // atras y se le avisa a los demas.
      roomManager.marcarConectado(code, socket.userId);
      roomManager.broadcastLobby(room);

      // Las mesas de torneo arrancan solas cuando estan los dos: en un torneo
      // nadie tiene por que apretar "empezar", y si alguien se distrae se traba
      // el cuadro entero.
      torneos.intentarArrancar(room);

      // Una mesa armada arranca sola cuando se sienta el ultimo pana que
      // faltaba (seccion 188), pero antes pregunta "estas?" (seccion 191): no
      // se reparte a una silla vacia. El que acaba de sentarse ya contesto.
      if (room.armada && !room.started && !result.reconnected && roomManager.sillasLibres(room) === 0) {
        roomManager.llamarALaMesa(code, socket.userId);
      } else if (room.armada && room.llamada && !room.started) {
        // Volvio en plena llamada: recibe la pregunta al entrar.
        socket.emit('mesa:estas', { code, ms: Math.max(0, room.llamada.hasta - Date.now()) });
      }

      // Si la partida ya comenzó, enviarle el estado actual del juego de inmediato
      if (room.started && room.game) {
        const state = room.game.getStateForPlayer(socket.userId);
        state.boardShape = room.boardShape;
        socket.emit('game:state', state);
      }

      callback?.({
        ok: true,
        room: {
          code: room.code,
          mode: room.mode,
          modeLabel: room.config.label,
          hasPool: room.config.hasPool,
          players: room.players,
          started: room.started,
          maxPlayers: room.config.totalPlayers
        }
      });
    });

    // LA ANTESALA (seccion 188): el que abrio la mesa marca una silla como de
    // la casa o la deja para un pana.
    socket.on('mesa:silla', ({ code, asiento, casa }, callback) => {
      const result = roomManager.marcarSilla(String(code || '').toUpperCase(), socket.userId, Number(asiento), Boolean(casa));
      if (result.error) return callback?.({ ok: false, error: result.error });
      roomManager.broadcastLobby(result.room);
      callback?.({ ok: true, sillas: roomManager.sillas(result.room) });
    });

    // "Estoy": la app contesta sola a la llamada (seccion 191).
    socket.on('mesa:estoy', ({ code }, callback) => {
      const r = roomManager.estoy(String(code || '').toUpperCase(), socket.userId);
      callback?.(r.error ? { ok: false, error: r.error } : { ok: true, started: Boolean(r.started) });
    });

    // El tablon: las mesas armadas, publicas, que todavia tienen silla.
    socket.on('mesas:listar', (callback) => {
      callback?.({ ok: true, mesas: roomManager.mesasAbiertas() });
    });

    socket.on('room:leave', ({ code }) => {
      // Irse de una partida EN CURSO es abandonarla.
      //
      // Antes solo se sacaba al jugador de la sala y el juego se quedaba
      // esperando su turno para siempre: los otros tres de un 2v2 quedaban
      // colgados mirando una mesa que no avanza mas. El motor ya sabia
      // resolver esto (FORFEIT), pero nadie se lo pedia.
      //
      // Se avisa ANTES de sacarlo, para que el aviso le llegue tambien a el:
      // el que se va tiene que ver por que termino, no una pantalla en blanco.
      roomManager.abandonarPartida(code, socket.userId);

      socket.leave(code);
      // Levantarse de una mesa armada antes del reparto no cuesta nada (regla 3).
      const sala = roomManager.rooms.get(code);
      if (sala?.armada && !sala.started) roomManager.soltarDeLaMesa(sala, socket.userId, 'se-levanto');
      else roomManager.leaveRoom(code, socket.userId);
    });

    socket.on('matchmaking:join', ({ mode }, callback) => {
      if (socket.isGuest) {
        return callback?.({ ok: false, error: 'Necesitas registrarte para jugar en línea' });
      }
      try {
        roomManager.addToMatchmaking(socket, mode);
        callback?.({ ok: true });
      } catch (e) {
        callback?.({ ok: false, error: e.message });
      }
    });

    socket.on('matchmaking:leave', (callback) => {
      roomManager.removeFromMatchmaking(socket.id);
      callback?.({ ok: true });
    });

    socket.on('room:start', async ({ code }, callback) => {
      // Una mesa armada con mas de una persona pasa por la llamada de "estas?".
      const armada = roomManager.rooms.get(code);
      if (armada?.armada && !armada.started) {
        if (armada.players[0]?.id !== socket.userId) return callback?.({ ok: false, error: 'Solo quien abrio la mesa la arranca' });
        const r = roomManager.llamarALaMesa(code, socket.userId);
        if (r.error) return callback?.({ ok: false, error: r.error });
        return callback?.({ ok: true, llamando: Boolean(r.llamando), started: Boolean(r.started) });
      }
      const result = roomManager.startGame(code);
      if (result.error) return callback?.({ ok: false, error: result.error });
      const room = result.room;
      roomManager.broadcastLobby(room);
      roomManager.broadcastState(room);
      callback?.({ ok: true });
      await roomManager.playBotTurns(room);
    });

    socket.on('game:play', async ({ code, tileIndex, side, x, y, x2, y2, orientation }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      
      // Normalmente no espera nada (HUMAN_DELAY_MS viene en cero). Se deja el
      // gancho por si alguna vez hace falta frenar la jugada a proposito.
      if (HUMAN_DELAY_MS > 0) await roomManager._sleep(HUMAN_DELAY_MS);

      // Re-verify that the room and game are still active after the sleep
      const activeRoom = roomManager.rooms.get(code);
      if (!activeRoom?.game) return callback?.({ ok: false, error: 'No hay juego' });
      
      const result = activeRoom.game.playTile(socket.userId, tileIndex, side, x, y, x2, y2, orientation);
      if (!result.ok) return callback?.(result);
      roomManager.broadcastState(activeRoom);
      callback?.(result);
      if (activeRoom.game.status === 'playing') {
        await roomManager.playBotTurns(activeRoom);
      }
    });

    socket.on('game:draw', async ({ code, poolIndex }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      const result = room.game.drawFromPool(socket.userId, poolIndex);
      if (!result.ok) return callback?.(result);
      roomManager.broadcastState(room);
      callback?.(result);
    });

    socket.on('game:pass', async ({ code }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      const result = room.game.pass(socket.userId);
      if (!result.ok) return callback?.(result);
      roomManager.broadcastState(room);
      callback?.(result);
      if (room.game.status === 'playing') {
        await roomManager.playBotTurns(room);
      }
    });

    socket.on('game:next-round', async ({ code }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      const ok = room.game.startNextRound();
      if (!ok) return callback?.({ ok: false, error: 'No se puede iniciar' });
      roomManager.broadcastState(room);
      callback?.({ ok: true });
      await roomManager.playBotTurns(room);
    });

    socket.on('game:explain', ({ code }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      callback?.({
        ok: true,
        ends: room.game.ends,
        fichas: room.game.explicarMano(socket.userId)
      });
    });

    // El sticker se comprueba ANTES de reenviarlo. Antes se reenviaba tal cual
    // lo que llegara, sin mirarlo: con las herramientas del navegador,
    // cualquiera podia mandar el texto que quisiera y salia flotando en la mesa
    // de todos. Ahora tiene que ser un sticker del catalogo, y de los que se
    // ganan, uno que esa persona tenga.
    socket.on('game:reaction', async ({ code, emoji }) => {
      const room = roomManager.rooms.get(code);
      if (!room) return;

      try {
        if (!(await Sticker.puedeTirar(socket.userId, emoji))) return;
      } catch (err) {
        console.error('No se pudo comprobar el sticker:', err.message);
        return;
      }

      io.to(code).emit('game:reaction', {
        playerId: socket.userId,
        username: socket.username,
        emoji
      });
    });

    socket.on('disconnect', () => {
      console.log(`👋 ${socket.username} desconectado`);
      roomManager.removeFromMatchmaking(socket.id);

      // Se le abre la ventana para volver, pero solo si el que se cae es la
      // conexion que ESTA usando. Si ya se habia reconectado por otro socket,
      // este que muere es el viejo y no hay que marcar a nadie como ausente.
      for (const [code, room] of roomManager.rooms) {
        const jugador = room.players.find((p) => p.id === socket.userId);
        if (jugador?.socketId !== socket.id) continue;
        // Una mesa armada que todavia no arranco (seccion 188): el que se va
        // se levanta de su silla, y si era el dueno la mesa se cierra y los
        // demas vuelven a la antesala. Sin esto el tablon se llenaba de mesas
        // fantasma de gente que cerro el telefono.
        if (room.armada && !room.started) {
          // En plena llamada el que se cae no se levanta: la llamada decide.
          if (room.llamada) { jugador.socketId = null; continue; }
          roomManager.soltarDeLaMesa(room, socket.userId, 'se-fue');
          continue;
        }
        roomManager.marcarDesconectado(code, socket.userId);
      }
    });
  });
}
