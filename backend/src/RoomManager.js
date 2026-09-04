import { randomSeed } from '@privoytruco/domino-engine';
import { elegirBots } from './game/bots.js';
import { DominoGame } from './game/DominoGame.js';
import { Bot } from './game/Bot.js';
import { MODE_CONFIG } from './game/DominoGame.js';
import * as Partida from './models/Partida.js';

const MODES = MODE_CONFIG;

export const BOT_DELAY_MS = Number(process.env.BOT_DELAY_MS ?? 3000);
export const HUMAN_DELAY_MS = Number(process.env.HUMAN_DELAY_MS ?? 1000);

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.io = null;
    this.matchmakingQueue = [];
  }

  setIO(io) {
    this.io = io;
  }

  generateCode() {
    let code;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom({ mode, hostId, hostUsername }) {
    const code = this.generateCode();
    const config = MODES[mode];
    if (!config) throw new Error('Modo inválido');

    const room = {
      code,
      mode,
      config,
      players: [
        { id: hostId, username: hostUsername, isBot: false, socketId: null }
      ],
      game: null,
      started: false
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code, { userId, username, socketId }) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };

    const existingPlayer = room.players.find((p) => p.id === userId);
    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      return { room, reconnected: true };
    }

    if (room.started) return { error: 'La partida ya comenzó' };
    if (room.players.length >= room.config.totalPlayers)
      return { error: 'Sala llena' };

    room.players.push({
      id: userId,
      username,
      isBot: false,
      socketId
    });
    return { room };
  }

  addToMatchmaking(socket, mode) {
    if (socket.isGuest) {
      throw new Error('Necesitas registrarte para jugar en línea');
    }

    const config = MODES[mode];
    if (!config) throw new Error('Modo inválido');

    // Buscar rivales para un modo que se llena con bots no tiene sentido: esa
    // partida arranca sola. Se corta aca para que el aviso salga claro en la
    // pantalla y no como un modo que "no encuentra a nadie".
    if (config.bots > 0) {
      throw new Error('Este modo se juega contra la maquina: no hace falta buscar rivales');
    }
    // Evitar duplicados en la cola
    this.removeFromMatchmaking(socket.id);
    
    this.matchmakingQueue.push({
      socket,
      userId: socket.userId,
      username: socket.username,
      mode
    });

    console.log(`🔍 [Matchmaking] ${socket.username} se unió a la cola para ${mode}. Cola: ${this.matchmakingQueue.length}`);
    
    process.nextTick(() => this.processMatchmaking(mode));
  }

  removeFromMatchmaking(socketId) {
    const initialLen = this.matchmakingQueue.length;
    this.matchmakingQueue = this.matchmakingQueue.filter(p => p.socket.id !== socketId);
    if (this.matchmakingQueue.length < initialLen) {
      console.log(`🔌 [Matchmaking] Removido socket ${socketId}. Restantes: ${this.matchmakingQueue.length}`);
    }
  }

  processMatchmaking(mode) {
    const config = MODES[mode];
    if (!config) return;

    // Cuantos hacen falta lo dice el modo, no un numero fijo.
    //
    // Antes tomaba siempre dos de la cola. En 2v2 hacen falta cuatro, asi que
    // creaba la sala, metia a los dos adentro, startGame devolvia
    // "Faltan jugadores (2/4)"... y ese error solo salia por consola del
    // servidor. Los dos quedaban fuera de la cola, en una sala que no arranca
    // nunca, mirando el "buscando partida" girar para siempre.
    const hacenFalta = config.humans;

    const modeQueue = this.matchmakingQueue.filter((p) => p.mode === mode);
    if (modeQueue.length < hacenFalta) return;

    const elegidos = modeQueue.slice(0, hacenFalta);
    elegidos.forEach((p) => this.removeFromMatchmaking(p.socket.id));

    const nombres = elegidos.map((p) => p.username).join(', ');
    console.log(`🤝 [Matchmaking] ¡Emparejando! ${nombres} para ${mode}`);

    /** Si algo sale mal, no se los deja tirados: vuelven a la cola. */
    const devolverALaCola = (motivo) => {
      console.error(`Matchmaking (${mode}): ${motivo}`);

      elegidos.forEach((p) => {
        p.socket.emit('matchmaking:error', { error: 'No se pudo armar la partida. Seguimos buscando.' });
        this.matchmakingQueue.push(p);
      });
    };

    const [anfitrion, ...resto] = elegidos;
    let room;

    try {
      room = this.createRoom({
        mode,
        hostId: anfitrion.userId,
        hostUsername: anfitrion.username
      });
    } catch (err) {
      devolverALaCola(err.message);
      return;
    }

    const jugadorAnfitrion = room.players.find((p) => p.id === anfitrion.userId);
    if (jugadorAnfitrion) jugadorAnfitrion.socketId = anfitrion.socket.id;
    anfitrion.socket.join(room.code);

    for (const p of resto) {
      const resultado = this.joinRoom(room.code, {
        userId: p.userId,
        username: p.username,
        socketId: p.socket.id
      });

      if (resultado.error) {
        this.rooms.delete(room.code);
        devolverALaCola(`no se pudo unir a ${p.username}: ${resultado.error}`);
        return;
      }

      p.socket.join(room.code);
    }

    const inicio = this.startGame(room.code);

    if (inicio.error) {
      this.rooms.delete(room.code);
      devolverALaCola(inicio.error);
      return;
    }

    this.broadcastLobby(room);
    this.broadcastState(room);

    elegidos.forEach((p) => p.socket.emit('matchmaking:success', { code: room.code }));

    console.log(`🚀 [Matchmaking] Partida iniciada en sala: ${room.code}`);
  }

  /**
   * Da la partida por abandonada por ese jugador.
   *
   * Solo hace algo si hay una partida en curso: salir del lobby antes de
   * arrancar no es abandonar nada, y no tiene que dar la victoria a nadie.
   */
  abandonarPartida(code, userId) {
    const room = this.rooms.get(code);
    if (!room || !room.game || room.game.status !== 'playing') return false;

    const jugador = room.players.find((p) => p.id === userId);
    if (!jugador || jugador.isBot) return false;

    const resultado = room.game.forfeit(userId);
    if (resultado?.ok === false) return false;

    this.broadcastState(room);
    return true;
  }

  leaveRoom(code, userId) {
    const room = this.rooms.get(code);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== userId);
    if (room.players.length === 0) {
      this.rooms.delete(code);
    }
  }

  startGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };
    if (room.started) return { error: 'Ya comenzó' };

    // Los modos con bots se completan solos. El humano siempre es el asiento 0,
    // asi que en 2v2 el companero le toca al asiento 2: es el de enfrente.
    const botsFaltantes = room.config.bots || 0;
    if (botsFaltantes > 0) {
      if (room.players.length !== room.config.humans) {
        return { error: `Este modo es para ${room.config.humans} jugador(es), hay ${room.players.length}` };
      }
      const elegidos = elegirBots(botsFaltantes, room.botPreferido);
      room.bot = elegidos[0];
      room.botDifficulty = elegidos[0].difficulty;
      elegidos.forEach((bot, i) => {
        room.players.push({
          id: `bot-${room.code}-${i + 1}`,
          username: bot.nombre,
          isBot: true,
          socketId: null,
          avatar: bot.avatar,
          difficulty: bot.difficulty,
          frase: bot.frase,
          estrellas: bot.estrellas
        });
      });
    } else {
      if (room.players.length < room.config.totalPlayers) {
        return { error: `Faltan jugadores (${room.players.length}/${room.config.totalPlayers})` };
      }
    }

    const shapes = ['espiral', 'serpiente', 'bucle', 'zigzag', 'laberinto'];
    room.boardShape = shapes[Math.floor(Math.random() * shapes.length)];

    room.seed = randomSeed();
    room.game = new DominoGame({
      roomCode: room.code,
      mode: room.mode,
      players: room.players,
      seed: room.seed
    });
    room.started = true;

    // El reloj arranca aqui y no en quien llame despues. Si dependiera de que
    // alguien se acuerde de emitir el estado, el PRIMER turno de la partida se
    // quedaria sin tiempo: justo el unico que nadie mira.
    this._ajustarReloj(room);

    return { room };
  }

  async playBotTurns(room) {
    while (room.game.status === 'playing') {
      const current = room.game.getCurrentPlayer();
      if (!current.isBot) break;

      // Esperar antes de realizar la jugada (tiempo de "pensamiento" del bot)
      await this._sleep(BOT_DELAY_MS);

      // Verificar que el juego sigue activo y sigue siendo el turno del bot después de dormir
      if (room.game.status !== 'playing' || room.game.getCurrentPlayer()?.id !== current.id) {
        break;
      }

      const validMoves = room.game.getValidMoves(current.id);
      if (validMoves.length > 0) {
        const bot = new Bot(room.game, current.id, room.botDifficulty || 'normal');
        const move = bot.chooseMove();
        if (move) {
          const c = move.placement || {};
          room.game.playTile(current.id, move.tileIndex, move.side, c.x, c.y, c.x2, c.y2, c.orientation);
        } else {
          room.game.pass(current.id);
        }
      } else if (room.game.hasPool && room.game.pool.length > 0) {
        const r = room.game.drawFromPool(current.id);
        if (!r.ok) {
          room.game.pass(current.id);
        }
      } else {
        room.game.pass(current.id);
      }

      this.broadcastState(room);
    }
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * El reloj del turno: 25 segundos para jugar.
   *
   * El reloj vive AQUI y no en el motor. El motor tiene prohibido usar relojes
   * por dentro porque tiene que dar siempre el mismo resultado con la misma
   * semilla; cuando se acaba el tiempo, este es el que le avisa.
   *
   * Solo corre en las partidas entre personas: los modos con maquina no traen
   * `turnMs`, y el bot no se cuelga.
   */
  _ajustarReloj(room) {
    const turnMs = room.config?.turnMs;
    if (!turnMs || !room.game) return;

    const enJuego = room.game.status === 'playing';
    const seat = room.game.state.turn;
    const jugador = enJuego ? room.players[seat] : null;
    const leCorre = Boolean(jugador) && !jugador.isBot;

    // El turno se identifica por ronda y asiento. Mientras sea el mismo, el
    // reloj NO se reinicia: si no, cada vez que se vuelve a emitir el estado
    // (por ejemplo cuando alguien se reconecta) se le regalarian 25 segundos.
    const clave = leCorre ? `${room.game.state.round}:${seat}` : null;
    if (clave && clave === room._relojDe) return;

    clearTimeout(room._reloj);
    room._reloj = null;
    room._relojDe = clave;

    if (!clave) {
      room.game.turnDeadline = null;
      return;
    }

    room.game.turnDeadline = Date.now() + turnMs;
    room._reloj = setTimeout(() => this._seLeAcaboElTiempo(room, jugador.id), turnMs);
    // Sin esto el proceso no termina nunca al apagar el servidor.
    room._reloj.unref?.();
  }

  _seLeAcaboElTiempo(room, playerId) {
    room._reloj = null;
    room._relojDe = null;

    if (!room.game || room.game.status !== 'playing') return;

    // Puede haber jugado justo cuando saltaba el reloj. Si ya no es su turno,
    // no se le quita nada.
    if (room.players[room.game.state.turn]?.id !== playerId) return;

    const jugador = room.players.find((p) => p.id === playerId);
    const seat = room.game.state.turn;

    const r = room.game.timeout(playerId);
    if (r?.ok === false) {
      console.error('No se pudo aplicar el tiempo agotado:', r.error);
      return;
    }

    // Para que en la pantalla se entienda POR QUE salto el turno. Sin esto el
    // turno cambia solo y parece un error del juego.
    room.game.saltadoPorTiempo = {
      seat,
      username: jugador?.username ?? 'Un jugador',
      n: (room.game.saltadoPorTiempo?.n ?? 0) + 1
    };

    this.broadcastState(room);
  }

  /**
   * Alguien se cayo: tiene 60 segundos para volver.
   *
   * Mientras tanto los demas ven el aviso con la cuenta atras. Si no vuelve,
   * abandona la partida, que es lo que ya pasaba antes al salirse.
   *
   * El reloj del turno NO se para por esto. Son dos cosas distintas: si no
   * jugas, pierdes la ronda, estes conectado o no; los 60 segundos son para no
   * perder la partida entera por un corte de internet.
   */
  marcarDesconectado(code, userId) {
    const room = this.rooms.get(code);
    if (!room?.started || !room.game || room.game.status === 'game-over') return;

    const ms = room.config?.reconnectMs;
    if (!ms) return;

    const jugador = room.players.find((p) => p.id === userId);
    if (!jugador || jugador.isBot || jugador.desconectadoHasta) return;

    clearTimeout(jugador._vuelta);
    jugador.desconectadoHasta = Date.now() + ms;

    jugador._vuelta = setTimeout(() => {
      jugador.desconectadoHasta = null;
      jugador._vuelta = null;
      this.abandonarPartida(code, userId);
      this.broadcastState(room);
    }, ms);
    jugador._vuelta.unref?.();

    this.broadcastState(room);
  }

  /** Volvio antes de que se acabaran los 60 segundos. */
  marcarConectado(code, userId) {
    const room = this.rooms.get(code);
    if (!room) return;

    const jugador = room.players.find((p) => p.id === userId);
    if (!jugador?.desconectadoHasta) return;

    clearTimeout(jugador._vuelta);
    jugador._vuelta = null;
    jugador.desconectadoHasta = null;

    this.broadcastState(room);
  }

  broadcastState(room) {
    if (!this.io || !room.game) return;

    this._ajustarReloj(room);

    room.players.forEach((p) => {
      if (p.isBot || !p.socketId) return;
      const state = room.game.getStateForPlayer(p.id);
      state.boardShape = room.boardShape;
      this.io.to(p.socketId).emit('game:state', state);
    });

    this._registrarSiTermino(room);
  }

  /**
   * Guarda la partida en el historial, una sola vez, cuando termino.
   *
   * Se cuelga de broadcastState porque es el unico punto por el que pasan
   * todos los finales: el normal, el abandono y el que termina por jugada de
   * un bot. Enganchar cada final por separado seria olvidarse de uno.
   *
   * No se espera el resultado: si la base falla, la partida ya se jugo y la
   * gente tiene que poder seguir. Se anota en el log y sigue.
   */
  _registrarSiTermino(room) {
    if (room._registrada) return;
    if (!room.game || room.game.status !== 'game-over') return;

    // Decision de Jonathan: solo cuentan las partidas entre personas.
    if ((room.config?.bots ?? 0) > 0) {
      room._registrada = true;
      return;
    }

    room._registrada = true;

    const equipoGanador = room.game.winningTeam;

    Partida.registrar({
      roomCode: room.code,
      modo: room.mode,
      equipoGanador,
      motivo: room.game.endReason,
      puntos: room.game.teamScores,
      jugadores: room.players.map((p, i) => ({
        userId: p.id,
        asiento: p.seat ?? i,
        equipo: p.team ?? null,
        gano: equipoGanador != null && p.team === equipoGanador
      }))
    }).catch((err) => {
      console.error('No se pudo guardar la partida', room.code, err.message);
    });
  }

  broadcastLobby(room) {
    if (!this.io) return;
    const lobbyState = {
      code: room.code,
      mode: room.mode,
      modeLabel: room.config.label,
      hasPool: room.config.hasPool,
      started: room.started,
      players: room.players.map((p) => ({
        id: p.id,
        username: p.username,
        isBot: p.isBot,
        isHost: p.id === room.players[0]?.id
      })),
      maxPlayers: room.config.totalPlayers
    };
    room.players.forEach((p) => {
      if (!p.isBot && p.socketId) {
        this.io.to(p.socketId).emit('lobby:update', lobbyState);
      }
    });
  }
}

export const roomManager = new RoomManager();
