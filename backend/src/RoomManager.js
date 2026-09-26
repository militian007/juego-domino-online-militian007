import { randomSeed, MODALIDADES, overridesDeModalidad } from '@privoytruco/domino-engine';
import { elegirBots } from './game/bots.js';
import * as Config from './models/Config.js';
import * as libreta from './services/libreta.js';
import { DominoGame } from './game/DominoGame.js';
import { Bot } from './game/Bot.js';
import { MODE_CONFIG } from './game/DominoGame.js';
import { MODALIDAD_POR_DEFECTO, esModalidad } from './game/DominoGame.js';
import * as Moneda from './models/Moneda.js';
import * as Partida from './models/Partida.js';
import * as Ranking from './models/Ranking.js';
import * as torneos from './services/torneos.js';
import * as pase from './services/pase.js';
import { olvidarMesa } from './sockets/mesaChat.js';

const MODES = MODE_CONFIG;

/**
 * Cuanto "piensa" el bot antes de jugar, en milisegundos (§152).
 *
 * Era un solo numero, 3000 fijos. En 2v2 hay tres bots entre una jugada de la
 * persona y la siguiente: nueve segundos de espera por vuelta, siempre iguales,
 * y ademas la maquina tardaba lo mismo para elegir entre siete fichas que para
 * pasar sin tener nada. Ahora el tiempo sale de un rango segun lo que tenga
 * que decidir, y varia un poco cada vez para que no parezca un metronomo.
 *
 * `BOT_DELAY_MS` por variable de entorno queda como TOPE: si esta puesta,
 * ningun tiempo la supera. Las pruebas la ponen en 0 para que una partida
 * entera corra en segundos.
 */
const BOT_THINK_MS = {
  opening: [2600, 2900], // la primera del bot espera a que termine el reparto animado (seccion 182),
  forced: [400, 600],
  choice: [850, 1150]
};
const tope = Number(process.env.BOT_DELAY_MS);
export const BOT_DELAY_MS = process.env.BOT_DELAY_MS != null && Number.isFinite(tope) ? tope : null;
/**
 * Espera artificial en la jugada de una PERSONA. En cero.
 *
 * Estaba en mil milisegundos "para que no se vea tan instantaneo". Los amigos
 * de Jonathan probaron el juego y lo primero que dijeron fue que entre elegir
 * la ficha y verla puesta se hacia eterno: era esto. Un segundo por jugada, y
 * ademas con la mano bloqueada mientras tanto.
 *
 * Una jugada propia tiene que sentirse inmediata: el jugador ya sabe lo que
 * hizo, no hay nada que anunciarle. La espera del BOT si se queda, que ahi si
 * hace falta para que parezca que piensa.
 *
 * Queda como variable de entorno por si algun dia hace falta, pero por defecto
 * no espera nada.
 */
export const HUMAN_DELAY_MS = Number(process.env.HUMAN_DELAY_MS ?? 0);

/**
 * LAS REGLAS DEL RELOJ Y DE LA GRACIA (seccion 191, ficha 2.3 de la plantilla).
 *
 * Son perillas de la casa, iguales en todos los juegos; aqui van por variable
 * de entorno hasta que el domino tenga su Config con botones (piso 8).
 *
 * - Cuando se acaba el tiempo, LA MESA JUEGA POR TI (seccion 195): el motor
 *   pone una ficha que valga, o levanta del pozo hasta poder, o pasa. Es la
 *   penalizacion que pidio Raul: la partida sigue y tu turno se fue.
 * - `DOMINO_STRIKES`: vencimientos seguidos que cuestan la partida. Apagado
 *   (0) mientras no haya plata en la mesa: sin apuesta, que la mesa juegue por
 *   el ausente y la partida siga (ficha 2.3 de la plantilla). Con plata, tres.
 * - `DOMINO_RELOJ_CORTO_MS`: tras un vencimiento, el reloj de ese jugador se
 *   acorta (15 s, minimo 3). El que se durmio una vez no vuelve a tener 25.
 * - `DOMINO_GRACIA_MS`: cuanto se espera al que se le cayo la conexion antes
 *   de darlo por ido (70 s, como Raul la puso en el truco).
 */
const entero = (llave, porDefecto, minimo = 0) => {
  const n = Number(process.env[llave]);
  return Number.isFinite(n) && n >= minimo ? n : porDefecto;
};
/** Las perillas del reloj, en un objeto para que las pruebas (y manana la Config) las muevan. */
/** A cuantos puntos se puede armar una mesa (seccion 198). */
export const PUNTOS_DE_LA_CASA = [50, 100, 150, 200];
export const puntosValidos = (n) => PUNTOS_DE_LA_CASA.includes(Number(n));
export const puntosPorDefecto = (modalidad) => overridesDeModalidad(modalidad).targetPoints ?? 100;

/**
 * Las perillas del reloj. Los valores de fabrica siguen viniendo del entorno
 * (asi las pruebas los mueven sin base), pero LO QUE MANDA es la Config de la
 * casa (seccion 201): `RELOJ.strikes` y compania leen la perilla si la hay.
 */
const RELOJ_BASE = {
  strikes: entero('DOMINO_STRIKES', 0, 0),
  cortoMs: entero('DOMINO_RELOJ_CORTO_MS', 15000, 3000),
  graciaMs: entero('DOMINO_GRACIA_MS', 70000, 5000)
};
const dePerilla = (clave, base) => {
  const v = Config.valor(clave);
  return typeof v === 'number' && Number.isFinite(v) ? v : base;
};
export const RELOJ = {
  get strikes() { return dePerilla('reloj.strikes', RELOJ_BASE.strikes); },
  get cortoMs() { return dePerilla('reloj.cortoMs', RELOJ_BASE.cortoMs); },
  get graciaMs() { return dePerilla('reloj.graciaMs', RELOJ_BASE.graciaMs); },
  /** Solo para las pruebas: fija el valor como si la perilla lo dijera. */
  set strikes(v) { RELOJ_BASE.strikes = v; Config.__ponerParaPruebas('reloj.strikes', v); }
};
export const RELOJ_CORTO_MS = RELOJ.cortoMs;
export const GRACIA_MS = RELOJ_BASE.graciaMs;

/** Cuanto vive una mesa con la partida terminada antes de que el barredor la cierre (seccion 210). */
export const MESA_TERMINADA_MS = 10 * 60 * 1000;

/** La llamada de "estas?" antes de repartir (ficha 2.1, regla 2): 3 s con todos conectados, 40 s si a alguno le falta el socket. */
export const LLAMADA_CORTA_MS = entero('DOMINO_LLAMADA_CORTA_MS', 3000, 500);
export const LLAMADA_LARGA_MS = entero('DOMINO_LLAMADA_LARGA_MS', 40000, 3000);

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.io = null;
    this.matchmakingQueue = [];
    // EL BARREDOR (seccion 210): el enjambre lo encontro. Una partida que
    // termina y cuyos jugadores cierran la app en vez de tocar «salir» se
    // quedaba en memoria para siempre (la desconexion no mira las partidas
    // terminadas): 19 mesas vivas al empezar, 96 al terminar la corrida.
    this._barredor = setInterval(() => this.barrerMesasTerminadas(), 60 * 1000);
    this._barredor.unref?.();
  }

  /**
   * Cierra las mesas cuya partida lleva MESA_TERMINADA_MS terminada sin que
   * nadie arrancara la revancha. Diez minutos: de sobra para el cartel final,
   * la revancha y el «¿pasó algo raro?». Devuelve cuantas cerro.
   */
  barrerMesasTerminadas(ahora = Date.now()) {
    let cerradas = 0;
    for (const [code, room] of this.rooms) {
      if (!room.game || room.game.status !== 'game-over') {
        delete room._terminoEn;
        continue;
      }
      room._terminoEn ??= ahora;
      if (ahora - room._terminoEn < MESA_TERMINADA_MS) continue;
      clearTimeout(room._reloj);
      this.cancelarLlamada(room);
      room.players.forEach((p) => clearTimeout(p._vuelta));
      this.rooms.delete(code);
      olvidarMesa(code);
      cerradas += 1;
    }
    return cerradas;
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

  /**
   * El codigo de una mesa armada (seccion 188): cuatro letras, sin las que se
   * confunden al dictarlas por telefono (I, O, Q). Se dicta "KMZA" y ya.
   */
  generarCodigoCorto() {
    const letras = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    let code;
    do {
      code = Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom({ mode, hostId, hostUsername, modalidad, avatar, armada, puntos }) {
    const config = MODES[mode];
    if (!config) throw new Error('Modo inválido');
    const code = armada ? this.generarCodigoCorto() : this.generateCode();
    const laModalidad = esModalidad(modalidad) ? modalidad : MODALIDAD_POR_DEFECTO[mode];

    const room = {
      code,
      mode,
      // Con que reglas se juega esta mesa (§128). Se guarda en la sala y no en
      // la partida porque hay que saberlo ANTES de repartir: quien entra por el
      // codigo tiene que ver a que lo estan invitando.
      modalidad: laModalidad,
      // A cuantos puntos (seccion 198): el que arma la mesa escoge entre los de
      // la casa; si no toca nada, los de la modalidad (100; el Cinco a 200).
      puntos: puntosValidos(puntos) ? Number(puntos) : puntosPorDefecto(laModalidad),
      config,
      players: [
        { id: hostId, username: hostUsername, isBot: false, socketId: null, avatar, asiento: 0 }
      ],
      game: null,
      started: false
    };
    // LA MESA ARMADA (seccion 188). El que la abre decide silla por silla si
    // la ocupa la casa o un pana; los panas entran por el codigo o desde el
    // tablon y se sientan en la primera silla libre que no sea de la casa. Al
    // arrancar, toda silla vacia la ocupa la casa: nadie se queda esperando.
    if (armada) {
      room.armada = true;
      room.publica = armada.publica !== false;
      room.casaEn = new Set((armada.casaEn || []).filter((i) => Number.isInteger(i) && i > 0 && i < config.totalPlayers));
      room.creadaEn = Date.now();
    }
    this.rooms.set(code, room);
    return room;
  }

  /**
   * EL CANDADO (seccion 191, ficha 2.1, regla 1): un jugador, un asiento, y el
   * candado vive en UNA sola funcion. Antes de sentar a alguien en una mesa
   * armada se mira donde mas esta:
   * - en una partida JUGANDO: no se sienta; se le devuelve ESA mesa
   *   (`YA_TIENES_MESA`) y la app lo lleva;
   * - en otra mesa armada esperando: se le suelta ese puesto (si era el dueno,
   *   esa mesa se cierra) y sigue.
   * Devuelve `{ error, code }` si no puede sentarse; si no, nada.
   */
  candado(userId, salvo = null) {
    for (const [code, room] of this.rooms) {
      if (code === salvo) continue;
      const jugador = room.players.find((p) => p.id === userId && !p.isBot);
      if (!jugador) continue;
      if (room.started && room.game && room.game.status !== 'game-over') {
        return { error: 'YA_TIENES_MESA', code };
      }
      if (room.started) continue;
      if (room.armada) this.soltarDeLaMesa(room, userId, 'otra-mesa');
      else this.leaveRoom(code, userId);
    }
    return null;
  }

  /**
   * Levanta a alguien de una mesa armada que no ha arrancado. Si era el dueno,
   * la mesa se cierra y los demas se enteran (`lobby:cerrada`); si no, la mesa
   * sigue esperando con los que quedan.
   */
  soltarDeLaMesa(room, userId, motivo = 'se-fue') {
    if (!room || room.started) return;
    const eraElDueno = room.players[0]?.id === userId;
    if (eraElDueno) {
      this.cancelarLlamada(room);
      room.players.forEach((p) => {
        if (!p.isBot && p.socketId && p.id !== userId) this.io?.to(p.socketId).emit('lobby:cerrada', { code: room.code, motivo });
      });
      this.rooms.delete(room.code);
      olvidarMesa(room.code);
      return;
    }
    room.players = room.players.filter((p) => p.id !== userId);
    if (room.llamada) room.llamada.contestaron.delete(userId);
    this.broadcastLobby(room);
  }

  /** Las sillas de una mesa armada, de la 0 (quien la abrio) a la ultima. */
  sillas(room) {
    const total = room.config.totalPlayers;
    return Array.from({ length: total }, (_, i) => {
      const ocupante = room.players.find((p) => p.asiento === i);
      if (ocupante) {
        return { asiento: i, tipo: ocupante.isBot ? 'casa' : 'pana', id: ocupante.id, username: ocupante.username, avatar: ocupante.avatar || ocupante.username };
      }
      return { asiento: i, tipo: room.casaEn?.has(i) ? 'casa' : 'libre' };
    });
  }

  /** El que abrio la mesa cambia una silla: la casa o un pana. Solo sillas vacias. */
  marcarSilla(code, userId, asiento, casa) {
    const room = this.rooms.get(code);
    if (!room || !room.armada) return { error: 'Sala no encontrada' };
    if (room.players[0]?.id !== userId) return { error: 'Solo quien abrio la mesa la arma' };
    if (room.started) return { error: 'La partida ya comenzó' };
    if (!Number.isInteger(asiento) || asiento <= 0 || asiento >= room.config.totalPlayers) return { error: 'Silla inválida' };
    if (room.players.some((p) => p.asiento === asiento)) return { error: 'Esa silla ya está ocupada' };
    if (casa) room.casaEn.add(asiento); else room.casaEn.delete(asiento);
    return { room };
  }

  /**
   * NO SE REPARTE A UNA SILLA VACIA (seccion 191, ficha 2.1, regla 2).
   *
   * Cuando la mesa armada va a arrancar con mas de una persona, antes de
   * repartir se les pregunta "estas?" (`mesa:estas`) y cada app contesta sola
   * (`mesa:estoy`), sin boton. Con todos conectados la llamada dura 3 s; si a
   * alguno le falta el socket, 40 s. Al que no contesta se le suelta el puesto
   * (`mesa:soltado`) y la mesa sigue con los demas, esperando a otro. Solo con
   * todos presentes se reparte. `quienPidio` ya contesto: fue su dedo.
   */
  llamarALaMesa(code, quienPidio = null) {
    const room = this.rooms.get(code);
    if (!room || !room.armada || room.started) return { error: 'Sala no encontrada' };
    const personas = room.players.filter((p) => !p.isBot);
    if (personas.length < 2) return this._repartirMesaArmada(room);
    if (room.llamada) return { llamando: true };

    const faltaAlguno = personas.some((p) => !p.socketId || !this.io?.sockets?.sockets?.get(p.socketId));
    const ms = faltaAlguno ? LLAMADA_LARGA_MS : LLAMADA_CORTA_MS;
    const contestaron = new Set(quienPidio ? [quienPidio] : []);
    room.llamada = { hasta: Date.now() + ms, contestaron, timer: null };
    personas.forEach((p) => {
      if (p.socketId) this.io?.to(p.socketId).emit('mesa:estas', { code, ms });
    });
    this.broadcastLobby(room);
    room.llamada.timer = setTimeout(() => this.cerrarLlamada(room), ms);
    room.llamada.timer.unref?.();
    return this._siContestaronTodos(room) || { llamando: true, ms };
  }

  /** Una app contesto "estoy". Si ya contestaron todos, se reparte. */
  estoy(code, userId) {
    const room = this.rooms.get(code);
    if (!room?.llamada) return { error: 'Nadie esta llamando' };
    if (!room.players.some((p) => p.id === userId && !p.isBot)) return { error: 'No estas en esa mesa' };
    room.llamada.contestaron.add(userId);
    return this._siContestaronTodos(room) || { ok: true };
  }

  _siContestaronTodos(room) {
    if (!room.llamada) return null;
    const personas = room.players.filter((p) => !p.isBot);
    if (!personas.every((p) => room.llamada.contestaron.has(p.id))) return null;
    this.cancelarLlamada(room);
    return this._repartirMesaArmada(room);
  }

  /** Se acabo la llamada: el que no contesto se levanta; la mesa sigue con los demas. */
  cerrarLlamada(room) {
    if (!room.llamada) return;
    const { contestaron } = room.llamada;
    this.cancelarLlamada(room);
    const ausentes = room.players.filter((p) => !p.isBot && !contestaron.has(p.id));
    for (const p of ausentes) {
      if (p.socketId) this.io?.to(p.socketId).emit('mesa:soltado', { code: room.code, motivo: 'no-contesto' });
      this.soltarDeLaMesa(room, p.id, 'no-contesto');
      if (!this.rooms.has(room.code)) return;
    }
    this.broadcastLobby(room);
  }

  cancelarLlamada(room) {
    if (!room.llamada) return;
    clearTimeout(room.llamada.timer);
    room.llamada = null;
  }

  _repartirMesaArmada(room) {
    const r = this.startGame(room.code);
    if (r.error) return r;
    this.broadcastLobby(room);
    this.broadcastState(room);
    this.playBotTurns(room);
    return { ok: true, started: true };
  }

  /**
   * LA REVANCHA (seccion 192, ficha 2.4 y regla 4): la mesa murio con su
   * partida, asi que la revancha es una mesa NUEVA con las mismas sillas: las
   * personas en las suyas, las de la casa como de la casa. A todos se les
   * manda `mesa:revancha` con el codigo; cada app va a la antesala, se sienta
   * (ya tiene su silla) y contesta "estoy"; cuando contestan todos se reparte.
   * Al que no llega en 40 s se le suelta la silla, y el dueno arranca con la
   * casa si quiere. Cualquiera de la mesa puede pedirla.
   */
  revancha(code, userId) {
    const vieja = this.rooms.get(code);
    if (!vieja?.armada || !vieja.game || vieja.game.status !== 'game-over') return { error: 'La partida no ha terminado' };
    if (!vieja.players.some((p) => p.id === userId && !p.isBot)) return { error: 'No estas en esa mesa' };
    if (vieja.revanchaEn && this.rooms.has(vieja.revanchaEn)) return { ok: true, code: vieja.revanchaEn };

    const personas = vieja.players.filter((p) => !p.isBot).sort((a, b) => a.asiento - b.asiento);
    const dueno = personas[0];
    const nueva = this.createRoom({
      mode: vieja.mode,
      modalidad: vieja.modalidad,
      puntos: vieja.puntos,
      hostId: dueno.id,
      hostUsername: dueno.username,
      avatar: dueno.avatar,
      armada: { casaEn: vieja.players.filter((p) => p.isBot).map((p) => p.asiento), publica: false }
    });
    nueva.players[0].asiento = dueno.asiento;
    personas.slice(1).forEach((p) => nueva.players.push({ id: p.id, username: p.username, isBot: false, socketId: null, avatar: p.avatar, asiento: p.asiento }));
    nueva.players.sort((a, b) => a.asiento - b.asiento);
    // El dueno de la nueva es el de la silla 0; si esa era de la casa, el primero que haya.
    vieja.revanchaEn = nueva.code;
    personas.forEach((p) => {
      if (p.socketId) this.io?.to(p.socketId).emit('mesa:revancha', { code: nueva.code, de: vieja.code, pidio: userId });
    });
    // La llamada larga: cada uno tiene que llegar a la antesala y sentarse.
    nueva.llamada = { hasta: Date.now() + LLAMADA_LARGA_MS, contestaron: new Set(), timer: null };
    nueva.llamada.timer = setTimeout(() => this.cerrarLlamada(nueva), LLAMADA_LARGA_MS);
    nueva.llamada.timer.unref?.();
    return { ok: true, code: nueva.code };
  }

  /** Cuantas sillas quedan para panas (ni ocupadas ni de la casa). */
  sillasLibres(room) {
    return this.sillas(room).filter((s) => s.tipo === 'libre').length;
  }

  /** Las mesas armadas, publicas y sin arrancar: el tablon (seccion 188). */
  mesasAbiertas() {
    const lista = [];
    for (const room of this.rooms.values()) {
      if (!room.armada || !room.publica || room.started) continue;
      if (this.sillasLibres(room) === 0) continue;
      lista.push({
        code: room.code,
        mode: room.mode,
        modeLabel: room.config.label,
        modalidad: room.modalidad,
        modalidadLabel: MODALIDADES[room.modalidad]?.label ?? room.modalidad,
        puntos: room.puntos,
        sillas: this.sillas(room),
        libres: this.sillasLibres(room),
        creadaEn: room.creadaEn
      });
    }
    return lista.sort((a, b) => b.creadaEn - a.creadaEn);
  }

  /**
   * LO QUE SE ESTA JUGANDO AHORA (seccion 198, copiado del truco: «que se
   * vean en la lista para que no parezca eso vacio cuando hay gente
   * jugando»). Solo mesas con al menos una persona y partida sin terminar.
   * A una mesa que ya arranco no se entra: estos renglones no llevan boton.
   */
  mesasEnJuego() {
    const lista = [];
    for (const room of this.rooms.values()) {
      if (!room.started || !room.game || room.game.status === 'game-over') continue;
      if (!room.players.some((p) => !p.isBot)) continue;
      lista.push({
        code: room.code,
        mode: room.mode,
        modalidadLabel: MODALIDADES[room.game.modalidad]?.label ?? room.game.modalidad,
        puntos: room.game.state?.config?.targetPoints ?? room.puntos ?? null,
        jugadores: room.players.map((p) => ({ username: p.username, avatar: p.avatar || p.username, casa: Boolean(p.isBot), asiento: p.asiento ?? room.players.indexOf(p) })),
        marcador: room.game.teamScores ?? null,
        empezoEn: room.game.empezoEn ?? null
      });
    }
    return lista.sort((a, b) => (b.empezoEn ?? 0) - (a.empezoEn ?? 0));
  }

  joinRoom(code, { userId, username, socketId, avatar }) {
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

    // En una mesa armada el pana se sienta en la primera silla libre que no
    // sea de la casa; si no queda ninguna, la mesa esta llena aunque falten
    // bots por sentar.
    let asiento = room.players.length;
    if (room.armada) {
      const libre = this.sillas(room).find((s) => s.tipo === 'libre');
      if (!libre) return { error: 'Sala llena' };
      asiento = libre.asiento;
    }

    room.players.push({
      id: userId,
      username,
      isBot: false,
      socketId,
      avatar,
      asiento
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
        olvidarMesa(room.code);
        devolverALaCola(`no se pudo unir a ${p.username}: ${resultado.error}`);
        return;
      }

      p.socket.join(room.code);
    }

    const inicio = this.startGame(room.code);

    if (inicio.error) {
      this.rooms.delete(room.code);
      olvidarMesa(room.code);
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
    // LA MESA MUERE CON SU PARTIDA (seccion 191, regla 4): sin personas la
    // sala se cierra, tenga o no bots sentados. Antes las mesas contra la
    // casa se quedaban vivas para siempre porque el bot nunca se levanta.
    if (!room.players.some((p) => !p.isBot)) {
      clearTimeout(room._reloj);
      this.cancelarLlamada(room);
      this.rooms.delete(code);
      olvidarMesa(code);
    }
  }

  startGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };
    if (room.started) return { error: 'Ya comenzó' };

    // Una mesa armada (seccion 188) arranca con los panas que llegaron: toda
    // silla vacia la ocupa la casa, y cada quien se queda en la silla que
    // escogio (en 2v2 la de enfrente es el companero).
    if (room.armada) {
      const total = room.config.totalPlayers;
      const faltan = total - room.players.length;
      if (faltan > 0) {
        const elegidos = elegirBots(faltan, room.botPreferido);
        room.bot = elegidos[0];
        room.botDifficulty = elegidos[0].difficulty;
        const ocupadas = new Set(room.players.map((p) => p.asiento));
        // LA CASA TORPE SUTIL (seccion 199): en la mesa armada los rivales de
        // la casa juegan con el nivel `casa` (una persona normal gana ~70 %,
        // medido); el companero de una persona en 2v2 juega `normal`, para no
        // hundirla. La cara y la frase siguen siendo las del bot elegido.
        const paridadDePersona = new Set(room.players.filter((p) => !p.isBot).map((p) => p.asiento % 2));
        let k = 0;
        for (let i = 0; i < total; i += 1) {
          if (ocupadas.has(i)) continue;
          const bot = elegidos[k];
          k += 1;
          const esCompanero = total === 4 && paridadDePersona.has(i % 2);
          room.players.push({
            id: `bot-${room.code}-${k}`,
            username: bot.nombre,
            isBot: true,
            socketId: null,
            avatar: bot.avatar,
            difficulty: esCompanero ? 'normal' : 'casa',
            frase: bot.frase,
            estrellas: bot.estrellas,
            asiento: i
          });
        }
      }
      room.players.sort((a, b) => a.asiento - b.asiento);
    }

    // Los modos con bots se completan solos. El humano siempre es el asiento 0,
    // asi que en 2v2 el companero le toca al asiento 2: es el de enfrente.
    const botsFaltantes = room.armada ? 0 : (room.config.bots || 0);
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
      modalidad: room.modalidad,
      puntos: room.puntos,
      players: room.players,
      seed: room.seed
    });
    room.game.empezoEn = Date.now();
    // La libreta de la partida (ficha 7.2): se abre al repartir y se va
    // llenando sola con los eventos del motor.
    libreta.abrir(room);
    room.game.graciaMs = room.config.reconnectMs ? RELOJ.graciaMs : null;
    room.game.armada = Boolean(room.armada);
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

      await this._sleep(this._botThinkMs(room, current.id));

      // Verificar que el juego sigue activo y sigue siendo el turno del bot después de dormir
      if (room.game.status !== 'playing' || room.game.getCurrentPlayer()?.id !== current.id) {
        break;
      }

      const validMoves = room.game.getValidMoves(current.id);
      if (validMoves.length > 0) {
        const bot = new Bot(room.game, current.id, current.difficulty || room.botDifficulty || 'normal');
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

  /**
   * La primera ficha de la ronda se piensa mas; con una sola jugada posible,
   * o sin ninguna (pasar o robar), no hay nada que pensar.
   */
  _botThinkMs(room, playerId) {
    let rango = BOT_THINK_MS.choice;
    if (room.game.board.length === 0) rango = BOT_THINK_MS.opening;
    else if (room.game.getValidMoves(playerId).length <= 1) rango = BOT_THINK_MS.forced;

    const [min, max] = rango;
    const ms = min + Math.random() * (max - min);
    return BOT_DELAY_MS == null ? ms : Math.min(ms, BOT_DELAY_MS);
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
    const turnoMs = room.config?.turnMs;
    if (!turnoMs || !room.game) return;

    const enJuego = room.game.status === 'playing';
    const seat = room.game.state.turn;
    const jugador = enJuego ? room.players[seat] : null;
    // Contra la maquina no hay reloj (decision de Jonathan, seccion 194): una
    // mesa armada con una sola persona y el resto la casa es una partida
    // contra la casa aunque el modo sea el de entre personas.
    const entrePersonas = room.players.filter((p) => !p.isBot).length >= 2;
    const leCorre = Boolean(jugador) && !jugador.isBot && entrePersonas;
    // Reloj corto tras un vencimiento (ficha 2.3): el que ya se durmio una vez
    // juega con menos tiempo el resto de la partida.
    const turnMs = leCorre && (jugador.strikes ?? 0) > 0 ? Math.min(turnoMs, RELOJ.cortoMs) : turnoMs;

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

    // Un identificador que cambia con CADA turno.
    //
    // Hace falta porque "cuanto falta" vale 25000 al empezar cualquier turno:
    // siempre el mismo numero. La pantalla no tenia forma de notar que era un
    // turno nuevo, no volvia a poner el reloj en hora, y la cuenta atras seguia
    // corriendo la del turno anterior aunque el otro ya hubiera jugado.
    room.game.turnoId = `${room.game.state.round}:${seat}:${(room._turnos = (room._turnos ?? 0) + 1)}`;
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

    // Los strikes (ficha 2.3): con plata en la mesa, al tercer vencimiento se
    // pierde la partida ("aceptaste, te quedas"). Sin plata (RELOJ.strikes en
    // 0) la mesa juega por el ausente y la partida sigue.
    jugador.strikes = (jugador.strikes ?? 0) + 1;
    if (RELOJ.strikes > 0 && jugador.strikes >= RELOJ.strikes) {
      room.game.saltadoPorTiempo = {
        seat,
        username: jugador?.username ?? 'Un jugador',
        n: (room.game.saltadoPorTiempo?.n ?? 0) + 1,
        strikes: jugador.strikes,
        tope: RELOJ.strikes,
        perdio: true
      };
      this.abandonarPartida(room.code, playerId);
      return;
    }

    // LA MESA JUEGA POR TI (seccion 195). Cada TIMEOUT del motor hace UNA cosa
    // (una ficha, una del pozo, o pasar); en 1 contra 1 levantar del pozo no
    // cede el turno, asi que se repite hasta que el turno pase o la partida
    // termine. El tope es por si acaso: el pozo no tiene mas de 14.
    let cuantas = 0;
    while (room.game.status === 'playing' && room.players[room.game.state.turn]?.id === playerId && cuantas < 30) {
      const r = room.game.timeout(playerId);
      cuantas += 1;
      if (r?.ok === false) {
        console.error('No se pudo aplicar el tiempo agotado:', r.error);
        break;
      }
    }

    // Para que en la pantalla se entienda POR QUE se jugo solo. Sin esto la
    // ficha aparece y parece un error del juego.
    room.game.saltadoPorTiempo = {
      seat,
      username: jugador?.username ?? 'Un jugador',
      n: (room.game.saltadoPorTiempo?.n ?? 0) + 1,
      strikes: jugador.strikes,
      tope: RELOJ.strikes || null,
      jugoLaMesa: true
    };

    this.broadcastState(room);
    // Si el turno cayo en la casa, la casa tiene que jugar (seccion 194): en
    // una mesa armada con bots, el vencimiento dejaba la partida pegada
    // porque nadie despertaba al bot.
    this.playBotTurns(room);
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

    // La gracia es una perilla de la casa (GRACIA_MS); `reconnectMs` en el modo
    // solo dice si en esta mesa hay gracia (entre personas) o no (contra la
    // casa, que ahi nadie pierde por un corte).
    const ms = room.config?.reconnectMs ? RELOJ.graciaMs : 0;
    if (!ms) return;

    const jugador = room.players.find((p) => p.id === userId);
    if (!jugador || jugador.isBot || jugador.desconectadoHasta) return;

    clearTimeout(jugador._vuelta);
    jugador.desconectadoHasta = Date.now() + ms;
    libreta.anotar(room.code, `Se le cayó la conexión a ${jugador.username}: la mesa lo espera ${Math.round(ms / 1000)} s.`, jugador.username);

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
    libreta.anotar(room.code, `${jugador.username} volvió antes de que se acabara la espera.`, jugador.username);

    this.broadcastState(room);
  }

  broadcastState(room) {
    if (room.started && room.game) libreta.anotarDelMotor(room.code, room);
    if (!this.io || !room.game) return;

    // Antes de mostrar nada: si al que le toca le falta SITIO y no jugada, se
    // vuelve a trazar la cadena. Va aqui porque es el unico punto por el que
    // pasan todos los cambios de estado, igual que el registro del final.
    const forma = room.game.destrancarSiHaceFalta();
    if (forma) {
      room.destrancadoEn = Date.now();
      console.log(`🔀 ${room.code}: mesa destrancada (${forma})`);
    }

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

    room._registrada = true;

    const conBots = (room.config?.bots ?? 0) > 0;

    // Se guarda el final de la PARTIDA, no el de la ultima ronda.
    //
    // `winningTeam` y `endReason` responden primero por la ronda que acaba de
    // cerrar, que es lo que hace falta para el cartel de fin de ronda. Para el
    // historial eso no sirve: guardaba "dominó" o "trancado", que es como
    // termino la ultima mano, y en el perfil parecia un historial de rondas.
    // Lo que cuenta para el ranking es quien llego a los 100.
    const resultado = room.game.state.result ?? null;
    const equipoGanador = resultado?.winnerTeam ?? room.game.winningTeam;

    const jugadores = room.players.map((p, i) => ({
      userId: p.id,
      asiento: p.seat ?? i,
      equipo: p.team ?? null,
      gano: equipoGanador != null && p.team === equipoGanador
    }));

    // Decision de Jonathan: en el historial y en el ranking solo cuentan las
    // partidas entre personas. Contra la maquina se juega, pero no se anota.
    if (!conBots) {
      Partida.registrar({
        roomCode: room.code,
        modo: room.mode,
        equipoGanador,
        motivo: resultado?.reason ?? room.game.endReason,
        puntos: room.game.teamScores,
        jugadores
      }).catch((err) => {
        console.error('No se pudo guardar la partida', room.code, err.message);
      });
    }

    // El pase de batalla si cuenta las dos, con distinta vara: contra la
    // maquina da mucho menos y con tope diario. Se hace aparte del historial
    // porque son dos preguntas distintas: el historial dice quien es mejor, el
    // pase dice quien esta jugando.
    this._avisarAlPase(room, conBots, equipoGanador);

    // Si la mesa es de un torneo, hay que seguir la llave: el que perdio queda
    // afuera y el que gano espera su proxima mesa.
    if (!conBots && room.torneoId && equipoGanador != null) {
      const gano = jugadores.find((j) => j.gano);
      const perdio = jugadores.find((j) => !j.gano);
      torneos.alTerminarPartida(room, gano?.userId ?? null, perdio?.userId ?? null)
        .catch((err) => console.error('Error avisando al torneo:', err.message));
    }

    // Los puntos del ranking. Solo si hubo ganador: una partida que termino
    // empatada o a medias no mueve el marcador de nadie.
    if (!conBots && equipoGanador != null) {
      Ranking.aplicarPartida(jugadores)
        .then((cambios) => this._avisarCambiosDeRanking(room, cambios))
        .catch((err) => {
          console.error('No se pudo actualizar el ranking', room.code, err.message);
        });
    }
  }

  /**
   * Le pasa la partida al pase de batalla.
   *
   * Solo van las personas: un bot no tiene pase. Y va con los puntos que hizo
   * el rival, que es lo que necesita la mision de la paliza.
   */
  _avisarAlPase(room, conBots, equipoGanador) {
    const marcador = room.game.teamScores ?? [];

    const jugadores = room.players
      .filter((p) => !p.isBot && p.id)
      .map((p) => ({
        userId: p.id,
        gano: equipoGanador != null && p.team === equipoGanador
      }));

    if (!jugadores.length) return;

    const puntosDelRival = {};
    for (const p of room.players) {
      if (p.isBot || !p.id) continue;
      const otro = p.team === 0 ? 1 : 0;
      puntosDelRival[p.id] = Number(marcador[otro] ?? 0);
    }

    pase.alTerminarPartida({ jugadores, modo: room.mode, conBots, puntosDelRival })
      .catch((err) => console.error('El pase no pudo con la partida:', err.message));

    this._pagarMonedas(room, conBots, jugadores);
  }

  /**
   * Paga las monedas de la partida (§133).
   *
   * **Contra la maquina no se paga**, igual que la clasificacion: si pagara,
   * la forma mas rapida de hacerse rico seria jugar solo contra la casa.
   *
   * La referencia es el codigo de la mesa, asi que si esto se llama dos veces
   * por la misma partida, la segunda no suma nada.
   */
  _pagarMonedas(room, conBots, jugadores) {
    if (conBots && !Moneda.PAGA_CONTRA_BOTS) return;
    if (!jugadores.length) return;

    Moneda.alTerminarPartida(jugadores, room.code)
      .then((pagos) => {
        for (const pago of pagos) {
          const jugador = room.players.find((p) => String(p.id) === String(pago.userId));
          if (jugador?.socketId) {
            this.io?.to(jugador.socketId).emit('monedas:ganadas', { cuanto: pago.cuanto });
          }
        }
      })
      .catch((err) => console.error('Las monedas no pudieron con la partida:', err.message));
  }

  /**
   * Le dice a cada uno cuanto se movio su marcador.
   *
   * Va por el socket y no en el estado de la partida porque llega DESPUES de
   * que la partida termino: el estado ya se emitio y no se vuelve a emitir.
   */
  _avisarCambiosDeRanking(room, cambios) {
    if (!this.io || !cambios?.length) return;

    for (const c of cambios) {
      const jugador = room.players.find((p) => Number(p.id) === c.userId);
      if (!jugador?.socketId) continue;
      this.io.to(jugador.socketId).emit('ranking:cambio', c);
    }
  }

  broadcastLobby(room) {
    if (!this.io) return;
    const lobbyState = {
      code: room.code,
      mode: room.mode,
      modalidad: room.modalidad,
      modeLabel: room.config.label,
      hasPool: room.config.hasPool,
      started: room.started,
      players: room.players.map((p) => ({
        id: p.id,
        username: p.username,
        isBot: p.isBot,
        avatar: p.avatar || p.username,
        isHost: p.id === room.players[0]?.id
      })),
      maxPlayers: room.config.totalPlayers,
      // La mesa armada (seccion 188): silla por silla, para dibujar la antesala.
      armada: Boolean(room.armada),
      sillas: room.armada ? this.sillas(room) : undefined,
      hostId: room.players[0]?.id,
      llamando: room.llamada ? { hasta: room.llamada.hasta, faltan: room.players.filter((p) => !p.isBot && !room.llamada.contestaron.has(p.id)).map((p) => p.username) } : null
    };
    room.players.forEach((p) => {
      if (!p.isBot && p.socketId) {
        this.io.to(p.socketId).emit('lobby:update', lobbyState);
      }
    });
  }
}

export const roomManager = new RoomManager();
