import { DominoGame, MODE_CONFIG } from './DominoGame.js';
import { Bot } from './Bot.js';
import { generateAllTiles, isDouble, tilePips } from './Tile.js';
import { RoomManager, RELOJ } from '../RoomManager.js';
import { playableMoves, necesitaDestrancar } from '@privoytruco/domino-engine';
import { jugadasSinSitio } from '@privoytruco/domino-engine/layout';
import { elegirBots } from './bots.js';
import { limpiar as moderar, esSpam, duracionSilencio, faltaEnPalabras } from '../services/moderacionDelChat.js';
import * as Config from '../models/Config.js';
import * as guardianes from '../services/guardianes.js';
import * as libreta from '../services/libreta.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

function setEnds(game, left, right) {
  const cx = 9;
  const cy = 10;
  game.board = [{
    tile: [left, right],
    side: 'first',
    x: cx,
    y: cy,
    x2: left === right ? cx : cx + 1,
    y2: left === right ? cy + 1 : cy,
    orientation: left === right ? 'vertical' : 'horizontal'
  }];
  game.ends = { left, right };
}

console.log('TEST 1: Crear juego 1v1 (2 jugadores, con pozo)');
{
  const game = new DominoGame({
    roomCode: 'T1V1A',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  assert(game.players.length === 2, '2 jugadores');
  assert(game.hasPool === true, 'Tiene pozo');
  assert(game.pool.length === 14, 'Pozo con 14 fichas');
  assert(Object.values(game.hands).every((h) => h.length === 7), '7 fichas por jugador');
  assert(game.status === 'playing', 'Estado playing');
  assert(game.players[0].team === 1 && game.players[1].team === 2, 'Equipos 1 y 2');
}

console.log('\nTEST 2: Crear juego 2v2 (4 jugadores, sin pozo)');
{
  const game = new DominoGame({
    roomCode: 'T2V2A',
    mode: '2v2',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false },
      { id: 'p3', username: 'C', isBot: false },
      { id: 'p4', username: 'D', isBot: false }
    ]
  });
  assert(game.players.length === 4, '4 jugadores');
  assert(game.hasPool === false, 'No tiene pozo');
  assert(game.pool.length === 0, 'Pozo vacío');
  assert(Object.values(game.hands).every((h) => h.length === 7), '7 fichas cada uno');
  assert(game.players[0].team === 1 && game.players[2].team === 1, 'P1 y P3 en equipo 1');
  assert(game.players[1].team === 2 && game.players[3].team === 2, 'P2 y P4 en equipo 2');
}

console.log('\nTEST 3: Crear juego 1v1+bot');
{
  const game = new DominoGame({
    roomCode: 'T1V1B',
    mode: '1v1bot',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'b1', username: 'Bot', isBot: true }
    ]
  });
  assert(game.players.length === 2, '2 jugadores (humano + bot)');
  assert(game.players[0].isBot === false, 'Humano no es bot');
  assert(game.players[1].isBot === true, 'Bot es bot');
  assert(game.hasPool === true, 'Tiene pozo');
}

console.log('\nTEST 4: Robar del pozo en 1v1');
{
  const game = new DominoGame({
    roomCode: 'TPOOL',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  game.hands.p1 = [[3, 4]];
  game.hands.p2 = [[1, 2]];
  game.pool = [[5, 5], [6, 6]];
  setEnds(game, 0, 0);
  game.currentPlayerIndex = 0;

  const r = game.drawFromPool('p1');
  assert(r.ok, 'Robo exitoso');
  assert(game.hands.p1.length === 2, 'P1 ahora tiene 2 fichas');
  assert(game.pool.length === 1, 'Queda 1 ficha en el pozo');
  assert(game.currentPlayerIndex === 0, 'Sigue siendo turno de P1');

  const r2 = game.drawFromPool('p1');
  assert(r2.ok, 'Segundo robo exitoso');
  assert(game.pool.length === 0, 'Pozo vacío');

  const r3 = game.drawFromPool('p1');
  assert(!r3.ok, 'No se puede robar del pozo vacío');
}

console.log('\nTEST 5: No se puede pasar si hay fichas en el pozo');
{
  const game = new DominoGame({
    roomCode: 'TNOPAS',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  game.hands.p1 = [[0, 0]];
  game.hands.p2 = [[1, 1]];
  game.pool = [[2, 2], [3, 3]];
  setEnds(game, 5, 5);
  game.currentPlayerIndex = 0;

  const r = game.pass('p1');
  assert(!r.ok, 'No se puede pasar con pozo lleno');
  assert(r.error.includes('pozo'), 'Mensaje menciona el pozo');
}

console.log('\nTEST 6: Sí se puede pasar cuando el pozo está vacío');
{
  const game = new DominoGame({
    roomCode: 'TSIPAS',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  game.hands.p1 = [[0, 0]];
  game.hands.p2 = [[1, 1]];
  game.pool = [];
  setEnds(game, 5, 5);
  game.currentPlayerIndex = 0;

  const r = game.pass('p1');
  assert(r.ok, 'Sí se puede pasar con pozo vacío');
  assert(game.currentPlayerIndex === 1, 'Pasa al siguiente turno');
}

console.log('\nTEST 7: En 2v2 siempre se puede pasar (no hay pozo)');
{
  const game = new DominoGame({
    roomCode: 'T2V2PS',
    mode: '2v2',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false },
      { id: 'p3', username: 'C', isBot: false },
      { id: 'p4', username: 'D', isBot: false }
    ]
  });
  game.hands.p1 = [[0, 0]];
  game.hands.p2 = [[1, 1]];
  game.hands.p3 = [[2, 2]];
  game.hands.p4 = [[3, 3]];
  setEnds(game, 5, 5);
  game.currentPlayerIndex = 0;

  const r = game.pass('p1');
  assert(r.ok, 'P1 pasa');
  const r2 = game.pass('p2');
  assert(r2.ok, 'P2 pasa');
  const r3 = game.pass('p3');
  assert(r3.ok, 'P3 pasa');
  const r4 = game.pass('p4');
  assert(r4.ok, 'P4 pasa y se tranca');
  assert(game.status === 'round-end', 'Ronda termina por tranque');
}

console.log('\nTEST 8: Tranque en 1v1 después de vaciar el pozo');
{
  const game = new DominoGame({
    roomCode: 'TBL1V1',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  game.hands.p1 = [[0, 0]];
  game.hands.p2 = [[1, 1]];
  game.pool = [];
  setEnds(game, 5, 5);
  game.currentPlayerIndex = 0;

  game.pass('p1');
  const r = game.pass('p2');
  assert(r.ok && r.blocked, 'Se tranca');
  assert(game.status === 'round-end', 'Estado round-end');
  assert(game.winningTeam !== null, 'Hay equipo ganador');
}

console.log('\nTEST 9: Bot juega en 1v1 con pozo');
{
  const game = new DominoGame({
    roomCode: 'TBOT1',
    mode: '1v1bot',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'b1', username: 'Bot', isBot: true }
    ]
  });
  game.currentPlayerIndex = 1;
  const bot = new Bot(game, 'b1');
  const move = bot.chooseMove();
  if (move) {
    const r = game.playTile('b1', move.tileIndex, move.side);
    assert(r.ok, 'Bot jugó su primera ficha');
  } else {
    assert(false, 'Bot no debería tener jugadas siempre');
  }
}

console.log('\nTEST 10: Estado del cliente incluye info de pozo y canDraw/canPass');
{
  const game = new DominoGame({
    roomCode: 'TSTATE',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  game.hands.p1 = [[0, 0]];
  game.hands.p2 = [[1, 1]];
  game.pool = [[2, 2]];
  setEnds(game, 5, 5);
  game.currentPlayerIndex = 0;
  const state = game.getStateForPlayer('p1');
  assert(state.hasPool === true, 'hasPool=true en 1v1');
  assert(state.poolCount === 1, 'poolCount=1');
  assert(state.canDraw === true, 'canDraw=true (no jugadas + hay pozo)');
  assert(state.canPass === false, 'canPass=false (hay pozo)');
  assert(state.canPlay === false, 'canPlay=false (no jugadas)');
}

console.log('\nTEST 11: Serialización en 2v2 (sin pozo)');
{
  const game = new DominoGame({
    roomCode: 'TS2V2',
    mode: '2v2',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false },
      { id: 'p3', username: 'C', isBot: false },
      { id: 'p4', username: 'D', isBot: false }
    ]
  });
  const state = game.getStateForPlayer('p1');
  assert(state.hasPool === false, 'hasPool=false en 2v2');
  assert(state.poolCount === 0, 'poolCount=0');
  assert(state.players.length === 4, '4 jugadores en estado');
  assert(state.players[0].team === 1, 'Equipo 1 = asientos 0,2');
  assert(state.players[1].team === 2, 'Equipo 2 = asientos 1,3');
}

console.log('\nTEST 12: Determinación de salida por doble más alto en 1v1');
{
  const game = new DominoGame({
    roomCode: 'TSTART',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  const allDoubles = Object.entries(game.hands)
    .map(([id, hand]) => ({ id, doubles: hand.filter(isDouble) }))
    .filter((x) => x.doubles.length > 0);
  if (allDoubles.length > 0) {
    const highest = allDoubles
      .flatMap((x) => x.doubles.map((d) => ({ player: x.id, tile: d })))
      .sort((a, b) => b.tile[0] - a.tile[0])[0];
    const expectedIdx = game.players.findIndex((p) => p.id === highest.player);
    assert(
      game.currentPlayerIndex === expectedIdx,
      `Empieza el que tiene el doble más alto (${highest.tile.join('-')})`
    );
  }
}

console.log('\nTEST 13: Lógica de giros (3 colocaciones para ficha normal)');
{
  const game = new DominoGame({
    roomCode: 'TTURN',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  // Colocar una ficha inicial horizontal
  game.board = [{
    tile: [5, 4],
    side: 'first',
    x: 10,
    y: 10,
    x2: 11,
    y2: 10,
    orientation: 'horizontal'
  }];
  game.ends = { left: 5, right: 4 };

  // Intentar colocar la ficha [4, 3] en el extremo derecho (valor 4)
  const placements = game.getValidPlacementsForTile([4, 3], 'right');
  
  // Debe haber exactamente 3 opciones:
  // 1. Recto (horizontal derecho): x: 12, y: 10, x2: 13, y2: 10
  // 2. Giro arriba (vertical arriba): x: 11, y: 8, x2: 11, y2: 9
  // 3. Giro abajo (vertical abajo): x: 11, y: 11, x2: 11, y2: 12
  assert(placements.length === 3, 'Tiene exactamente 3 opciones de colocación');
  
  const straight = placements.find(p => p.orientation === 'horizontal');
  assert(straight && straight.x === 12 && straight.y === 10 && straight.x2 === 13 && straight.y2 === 10, 'Opción recta horizontal es correcta');

  const up = placements.find(p => p.orientation === 'vertical' && p.y === 9);
  assert(up && up.x === 11 && up.y === 9 && up.x2 === 11 && up.y2 === 8, 'Opción giro arriba vertical es correcta');

  const down = placements.find(p => p.orientation === 'vertical' && p.y === 11);
  assert(down && down.x === 11 && down.y === 11 && down.x2 === 11 && down.y2 === 12, 'Opción giro abajo vertical es correcta');
}

console.log('\nTEST 14: Colocación de ficha doble perpendicular');
{
  const game = new DominoGame({
    roomCode: 'TDOUBLE',
    mode: '1v1',
    players: [
      { id: 'p1', username: 'A', isBot: false },
      { id: 'p2', username: 'B', isBot: false }
    ]
  });
  // Colocar una ficha inicial horizontal
  game.board = [{
    tile: [5, 4],
    side: 'first',
    x: 10,
    y: 10,
    x2: 11,
    y2: 10,
    orientation: 'horizontal'
  }];
  game.ends = { left: 5, right: 4 };

  // Intentar colocar la ficha doble [4, 4] en el extremo derecho (valor 4)
  const placements = game.getValidPlacementsForTile([4, 4], 'right');

  // Debe haber 2 opciones: el doble se cruza perpendicular y puede sobresalir
  // hacia arriba o hacia abajo de la linea de la cadena.
  assert(placements.length === 2, 'Tiene 2 opciones cruzadas para el doble');
  assert(placements.every(p => p.orientation === 'vertical'), 'Ambas son verticales');
  assert(placements.every(p => p.x === 12 && p.x2 === 12), 'Ambas en la columna siguiente');

  const arriba = placements.find(p => Math.min(p.y, p.y2) === 9);
  assert(arriba && arriba.x === 12 && arriba.y === 10 && arriba.x2 === 12 && arriba.y2 === 9,
    'La opción que sobresale hacia arriba es correcta y centrada');

  const abajo = placements.find(p => Math.min(p.y, p.y2) === 10);
  assert(abajo && abajo.y === 10 && abajo.y2 === 11, 'La opción que sobresale hacia abajo es correcta');
}

console.log('\nTEST 15: Cola de matchmaking y emparejamiento 1v1');
{
  const rm = new RoomManager();

  const socketA = {
    id: 'sA',
    userId: 'p1',
    username: 'Player A',
    isGuest: false,
    joined: [],
    emitted: [],
    join(code) { this.joined.push(code); },
    emit(event, data) { this.emitted.push({ event, data }); }
  };

  const socketB = {
    id: 'sB',
    userId: 'p2',
    username: 'Player B',
    isGuest: false,
    joined: [],
    emitted: [],
    join(code) { this.joined.push(code); },
    emit(event, data) { this.emitted.push({ event, data }); }
  };

  // 1. Agregar Player A
  rm.addToMatchmaking(socketA, '1v1');
  assert(rm.matchmakingQueue.length === 1, 'Player A en la cola');
  assert(rm.matchmakingQueue[0].userId === 'p1', 'ID del jugador A es correcto');

  // 2. Intentar agregar de nuevo (debe evitar duplicados)
  rm.addToMatchmaking(socketA, '1v1');
  assert(rm.matchmakingQueue.length === 1, 'No hay duplicados de Player A en la cola');

  // 3. Agregar Player B
  rm.addToMatchmaking(socketB, '1v1');
  rm.processMatchmaking('1v1');

  assert(rm.matchmakingQueue.length === 0, 'La cola quedó vacía tras emparejar');
  assert(socketA.joined.length === 1, 'Player A se unió a la sala en socket.io');
  assert(socketB.joined.length === 1, 'Player B se unió a la sala en socket.io');
  
  const roomCode = socketA.joined[0];
  assert(roomCode && roomCode.length === 6, 'Código de sala de 6 letras generado');
  assert(socketB.joined[0] === roomCode, 'Ambos jugadores están en la misma sala');

  const successEmitA = socketA.emitted.find(e => e.event === 'matchmaking:success');
  const successEmitB = socketB.emitted.find(e => e.event === 'matchmaking:success');
  assert(successEmitA && successEmitA.data.code === roomCode, 'Player A recibió matchmaking:success');
  assert(successEmitB && successEmitB.data.code === roomCode, 'Player B recibió matchmaking:success');

  const room = rm.rooms.get(roomCode);
  assert(room !== undefined, 'La sala fue creada en el manager');
  assert(room.started === true, 'La partida fue iniciada automáticamente');
  assert(room.game !== null, 'El motor de juego fue inicializado');
}

console.log('\nTEST 2v2 con bots: la mesa se arma sola y en el orden correcto');
{
  const cfg = MODE_CONFIG['2v2bots'];
  assert(cfg !== undefined, 'existe el modo 2v2bots');
  assert(cfg.totalPlayers === 4 && cfg.humans === 1 && cfg.bots === 3, 'es 1 humano y 3 bots');
  assert(cfg.hasPool === false, 'el 2v2 no lleva pozo');
  assert(cfg.gameFormat === 'domino-2v2-v1', 'usa el mismo gameFormat que el 2v2 real');

  const tres = elegirBots(3);
  assert(tres.length === 3, 'elegirBots devuelve la cantidad pedida');
  assert(new Set(tres.map((b) => b.id)).size === 3, 'los tres bots son distintos');

  const rm = new RoomManager();
  const sala = rm.createRoom({ mode: '2v2bots', hostId: 'humano', hostUsername: 'Vos' });
  const res = rm.startGame(sala.code);
  assert(!res.error, 'la partida arranca con un solo humano en la sala');

  const juego = rm.rooms.get(sala.code).game;
  assert(juego.players.length === 4, 'se sientan cuatro');
  assert(juego.players[0].id === 'humano', 'el humano queda en el asiento 0');
  assert(juego.players.slice(1).every((j) => j.isBot), 'los otros tres son bots');
  assert(juego.players[0].team === juego.players[2].team, 'el asiento 2 es tu companero');
  assert(juego.players[0].team !== juego.players[1].team, 'el asiento 1 es rival');
  assert(juego.players[0].team !== juego.players[3].team, 'el asiento 3 es rival');
  assert(juego.pool.length === 0, 'no queda pozo: las 28 fichas se repartieron');
  assert(juego.players.every((j) => juego.hands[j.id].length === 7), 'siete fichas cada uno');

  const vista = juego.getStateForPlayer('humano');
  assert(vista.myHand.length === 7, 'la vista trae tu mano');
  assert(vista.hasPool === false && vista.canDraw === false, 'nunca se puede robar en 2v2');
  const manoRival = JSON.stringify(juego.hands[juego.players[1].id]);
  assert(JSON.stringify(vista).indexOf(manoRival) === -1, 'la vista NO expone la mano del rival');
}

console.log('TEST: La mesa armada y las cuatro reglas del piso 2 (secciones 188 y 191)');
{
  // Un io de mentira: guarda lo que se le emite a cada socket.
  const emitidos = [];
  const io = { to: (sid) => ({ emit: (ev, data) => emitidos.push({ sid, ev, data }) }), sockets: { sockets: new Map([['s-raul', {}], ['s-chela', {}], ['s-nano', {}]]) } };
  const rm = new RoomManager();
  rm.setIO(io);

  // La mesa armada: silla 1 de la casa, 2 y 3 para panas
  const sala = rm.createRoom({ mode: '2v2', hostId: 'raul', hostUsername: 'Raul', avatar: 'catire', armada: { casaEn: [1], publica: true } });
  sala.players[0].socketId = 's-raul';
  assert(/^[A-HJ-NP-Z]{4}$/.test(sala.code), 'el codigo es de cuatro letras sin I, O ni Q');
  assert(rm.sillas(sala).map((x) => x.tipo).join(',') === 'pana,casa,libre,libre', 'sillas: tu, la casa, dos libres');
  assert(rm.mesasAbiertas().some((m) => m.code === sala.code), 'la mesa sale en el tablon');

  const j1 = rm.joinRoom(sala.code, { userId: 'chela', username: 'Chela', socketId: 's-chela', avatar: 'chela' });
  assert(!j1.error && j1.room.players.find((p) => p.id === 'chela').asiento === 2, 'el pana se sienta en la primera silla libre que no es de la casa');
  assert(rm.marcarSilla(sala.code, 'chela', 3, true).error, 'solo el dueno marca sillas');
  assert(rm.marcarSilla(sala.code, 'raul', 2, true).error, 'una silla ocupada no se marca');

  // REGLA 2: "estas?" con todos conectados: nadie contesta todavia -> llamando
  const llamada = rm.llamarALaMesa(sala.code, 'raul');
  assert(llamada.llamando === true && sala.llamada, 'con dos personas se pregunta "estas?" antes de repartir');
  assert(emitidos.some((e) => e.sid === 's-chela' && e.ev === 'mesa:estas'), 'la pregunta le llega al pana');
  assert(!sala.started, 'no se reparte hasta que contesten');
  const r = rm.estoy(sala.code, 'chela');
  assert(r.started === true && sala.started, 'cuando contesta el ultimo, se reparte');
  assert(sala.players.length === 4 && sala.players.filter((p) => p.isBot).length === 2, 'las dos sillas vacias las ocupo la casa');
  assert(sala.players.map((p) => p.asiento).join(',') === '0,1,2,3', 'cada quien en su silla');
  assert(sala.game.players[0].team === sala.game.players[2].team, 'el pana de enfrente es tu companero');
  clearTimeout(sala._reloj);

  // REGLA 1: el candado. Raul esta jugando: no puede abrir otra mesa.
  const traba = rm.candado('raul');
  assert(traba?.error === 'YA_TIENES_MESA' && traba.code === sala.code, 'el candado devuelve la mesa donde ya estas jugando');
  // Nano espera en una mesa y abre otra: se le suelta el puesto de la primera.
  const esperaA = rm.createRoom({ mode: '1v1', hostId: 'nano', hostUsername: 'Nano', armada: { casaEn: [], publica: true } });
  assert(rm.candado('nano') === null, 'esperando en otra mesa no traba');
  assert(!rm.rooms.has(esperaA.code), 'pero esa mesa de espera se cerro (era el dueno)');

  // REGLA 2, el que no contesta: se le suelta la silla y la mesa sigue
  const mesaB = rm.createRoom({ mode: '2v2', hostId: 'dueno', hostUsername: 'Dueno', armada: { casaEn: [1], publica: true } });
  mesaB.players[0].socketId = 's-raul';
  rm.joinRoom(mesaB.code, { userId: 'juana', username: 'Juana', socketId: 's-nano' });
  rm.llamarALaMesa(mesaB.code, 'dueno');
  rm.cerrarLlamada(mesaB);
  assert(rm.rooms.has(mesaB.code) && !mesaB.started, 'la mesa sigue sin arrancar');
  assert(!mesaB.players.some((p) => p.id === 'juana'), 'a la que no contesto se le solto la silla');
  assert(emitidos.some((e) => e.ev === 'mesa:soltado'), 'y se le aviso');
  assert(rm.sillasLibres(mesaB) === 2, 'la silla vuelve a quedar libre');

  // REGLA 3 antes del reparto: levantarse es gratis; si se levanta el dueno, la mesa se cierra
  rm.joinRoom(mesaB.code, { userId: 'juana', username: 'Juana', socketId: 's-nano' });
  rm.soltarDeLaMesa(mesaB, 'juana', 'se-levanto');
  assert(rm.rooms.has(mesaB.code) && rm.sillasLibres(mesaB) === 2, 'el pana se levanta y la mesa sigue');
  rm.soltarDeLaMesa(mesaB, 'dueno', 'se-fue');
  assert(!rm.rooms.has(mesaB.code), 'si se va el dueno, la mesa se cierra');

  // REGLA 4: la mesa muere con su partida
  rm.leaveRoom(sala.code, 'raul');
  assert(rm.rooms.has(sala.code), 'con Chela todavia sentada la mesa sigue');
  rm.leaveRoom(sala.code, 'chela');
  assert(!rm.rooms.has(sala.code), 'sin personas la mesa se cierra aunque queden bots');
}

console.log('TEST: Strikes y reloj corto (seccion 191)');
{
  RELOJ.strikes = 3; // con plata en la mesa
  const rm = new RoomManager();
  rm.setIO({ to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } });
  const sala = rm.createRoom({ mode: '1v1', hostId: 'a', hostUsername: 'A' });
  rm.joinRoom(sala.code, { userId: 'b', username: 'B', socketId: 'sb' });
  const res = rm.startGame(sala.code);
  assert(!res.error, 'arranca la 1v1 entre personas');
  clearTimeout(sala._reloj);
  const juego = sala.game;
  assert(juego.getStateForPlayer('a').graciaMs >= 5000, 'la gracia viaja en el estado');
  const primero = sala.players[juego.state.turn];
  const otro = sala.players.find((p) => p.id !== primero.id);
  rm._seLeAcaboElTiempo(sala, primero.id);
  assert(primero.strikes === 1 && juego.saltadoPorTiempo?.strikes === 1 && juego.saltadoPorTiempo.tope === 3, 'primer vencimiento: strike 1 de 3');
  assert(juego.status === 'playing', 'la partida sigue');
  // el reloj corto: al volverle el turno, su plazo es menor que el del otro
  clearTimeout(sala._reloj);
  sala._relojDe = null;
  juego.state.turn = sala.players.indexOf(primero);
  rm._ajustarReloj(sala);
  const plazoCorto = juego.turnDeadline - Date.now();
  clearTimeout(sala._reloj); sala._relojDe = null;
  juego.state.turn = sala.players.indexOf(otro);
  rm._ajustarReloj(sala);
  const plazoNormal = juego.turnDeadline - Date.now();
  clearTimeout(sala._reloj);
  assert(plazoCorto < plazoNormal && plazoCorto <= 15000, `tras un strike el reloj es corto (${Math.round(plazoCorto / 1000)} s contra ${Math.round(plazoNormal / 1000)} s)`);
  juego.state.turn = sala.players.indexOf(primero);
  rm._seLeAcaboElTiempo(sala, primero.id);
  juego.state.turn = sala.players.indexOf(primero);
  rm._seLeAcaboElTiempo(sala, primero.id);
  assert(primero.strikes === 3 && juego.saltadoPorTiempo?.perdio === true, 'al tercer strike pierde');
  assert(juego.status === 'game-over', 'y la partida termina');
  RELOJ.strikes = 0;
}

console.log('TEST: Contra la casa no hay reloj, y tras un vencimiento la casa juega (seccion 194)');
{
  const rm = new RoomManager();
  rm.setIO({ to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } });
  // Mesa armada 1v1 con una sola persona: la otra silla es de la casa.
  const sola = rm.createRoom({ mode: '1v1', hostId: 'raul', hostUsername: 'Raul', armada: { casaEn: [1], publica: false } });
  assert(!rm.startGame(sola.code).error, 'arranca la 1v1 armada contra la casa');
  assert(sola.game.turnDeadline == null, 'sin otra persona en la mesa no corre el reloj');
  clearTimeout(sola._reloj);

  // Mesa armada 2v2 con dos personas y dos bots: el reloj corre para las personas.
  const mixta = rm.createRoom({ mode: '2v2', hostId: 'a', hostUsername: 'A', armada: { casaEn: [1, 3], publica: false } });
  rm.joinRoom(mixta.code, { userId: 'b', username: 'B', socketId: 'sb' });
  assert(!rm.startGame(mixta.code).error, 'arranca la 2v2 mixta');
  const juego = mixta.game;
  const persona = mixta.players.find((p) => !p.isBot && mixta.players.indexOf(p) === juego.state.turn) || null;
  // Forzar el turno a una persona cuyo siguiente es un bot (asientos 0->1, 2->3).
  clearTimeout(mixta._reloj); mixta._relojDe = null;
  juego.state.turn = 0;
  rm._ajustarReloj(mixta);
  assert(juego.turnDeadline != null, 'con dos personas si corre el reloj');
  clearTimeout(mixta._reloj);
  let despertado = 0;
  const original = rm.playBotTurns.bind(rm);
  rm.playBotTurns = async (room) => { despertado += 1; return original(room); };
  rm._seLeAcaboElTiempo(mixta, mixta.players[0].id);
  assert(despertado === 1, 'tras el vencimiento se despierta a la casa para que juegue');
  void persona;
}

console.log('TEST: Se acabo el tiempo y la mesa juega por ti (seccion 195)');
{
  const rm = new RoomManager();
  rm.setIO({ to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } });
  const sala = rm.createRoom({ mode: '1v1', hostId: 'a', hostUsername: 'A' });
  rm.joinRoom(sala.code, { userId: 'b', username: 'B', socketId: 'sb' });
  rm.startGame(sala.code);
  clearTimeout(sala._reloj);
  const juego = sala.game;
  const quien = sala.players[juego.state.turn];
  const fichasAntes = juego.hands[quien.id].length;
  const pozoAntes = juego.pool.length;
  rm._seLeAcaboElTiempo(sala, quien.id);
  clearTimeout(sala._reloj);
  const jugo = juego.hands[quien.id].length === fichasAntes - 1 || juego.pool.length < pozoAntes || juego.board.length > 0;
  assert(jugo, 'al vencer el reloj la mesa jugo por el (ficha puesta o pozo levantado)');
  assert(sala.players[juego.state.turn].id !== quien.id || juego.status !== 'playing', 'y el turno paso al otro');
  assert(juego.saltadoPorTiempo?.jugoLaMesa === true && juego.saltadoPorTiempo.perdio !== true, 'el aviso dice que la mesa jugo por el, sin perder la partida');
  assert(juego.status === 'playing', 'la partida sigue');
}

console.log('TEST: Modalidad y puntos en la mesa armada, y lo que se juega ahora (seccion 198)');
{
  const rm = new RoomManager();
  const a = rm.createRoom({ mode: '1v1', hostId: 'a', hostUsername: 'A', armada: { casaEn: [], publica: true } });
  assert(a.modalidad === 'pozo' && a.puntos === 100, 'sin tocar nada: 1v1 con pozo a 100');
  const c = rm.createRoom({ mode: '1v1', hostId: 'c', hostUsername: 'C', modalidad: 'cinco', armada: { casaEn: [], publica: true } });
  assert(c.puntos === 200, 'el Cinco arranca a 200');
  const t = rm.createRoom({ mode: '2v2', hostId: 't', hostUsername: 'T', modalidad: 'tranca', puntos: 150, armada: { casaEn: [1], publica: true } });
  assert(t.puntos === 150, 'a 150 si lo pide');
  const x = rm.createRoom({ mode: '2v2', hostId: 'x', hostUsername: 'X', puntos: 999, armada: { casaEn: [1, 2, 3], publica: true } });
  assert(x.puntos === 100, 'un numero que no es de la casa cae al de la modalidad');
  const fila = rm.mesasAbiertas().find((m) => m.code === t.code);
  assert(fila.modalidadLabel === 'Tranca' && fila.puntos === 150, 'el tablon dice modalidad y puntos');
  assert(rm.mesasEnJuego().length === 0, 'nada se juega todavia');
  rm.startGame(t.code);
  assert(t.game.state.config.targetPoints === 150, 'la partida se juega a 150');
  const enJuego = rm.mesasEnJuego();
  assert(enJuego.length === 1 && enJuego[0].code === t.code, 'la mesa arrancada sale en "jugandose ahora"');
  assert(enJuego[0].jugadores.length === 4 && enJuego[0].jugadores.filter((j) => j.casa).length === 3, 'con sus cuatro sillas, tres de la casa');
  assert(enJuego[0].modalidadLabel === 'Tranca' && enJuego[0].puntos === 150 && enJuego[0].marcador[1] === 0 && enJuego[0].marcador[2] === 0, 'con modalidad, puntos y marcador');
  assert(rm.mesasAbiertas().every((m) => m.code !== t.code), 'y ya no esta en el tablon');
}

console.log('TEST: La casa torpe sutil (seccion 199)');
{
  const rm = new RoomManager();
  const t = rm.createRoom({ mode: '2v2', hostId: 'h', hostUsername: 'H', armada: { casaEn: [1, 2, 3], publica: false } });
  rm.startGame(t.code);
  const porSilla = Object.fromEntries(t.players.map((p) => [p.asiento, p.difficulty || 'persona']));
  assert(porSilla[2] === 'normal', 'el companero de la persona (silla 2) juega normal');
  assert(porSilla[1] === 'casa' && porSilla[3] === 'casa', 'los rivales de la casa juegan con el nivel casa');
  const u = rm.createRoom({ mode: '1v1', hostId: 'h2', hostUsername: 'H2', armada: { casaEn: [], publica: false } });
  rm.startGame(u.code);
  assert(u.players.find((p) => p.isBot)?.difficulty === 'casa', 'en 1v1 el rival es la casa');
}

console.log('TEST: La punta que el dibujo tapaba (seccion 205)');
{
  // Se juegan partidas con bots hasta dar con el caso de Raul: al que le toca
  // TIENE jugada, pero una de sus jugadas legales no cabe dibujada. Antes no se
  // reacomodaba (y el telefono le escondia esa punta); ahora si.
  let casos = 0;
  let conSitio = 0;
  let sinTocar = 0;
  for (let semilla = 1; semilla <= 600 && casos < 5; semilla += 1) {
    const players = [0, 1].map((i) => ({ id: `p${i}`, username: `P${i}`, isBot: true, difficulty: 'normal' }));
    const juego = new DominoGame({ roomCode: 'PUNTA', mode: '1v1', players, seed: semilla });
    let vueltas = 0;
    while (juego.status === 'playing' && vueltas++ < 3000) {
      const s = juego.state;
      const seat = s.turn;
      if (s.board.length > 0 && playableMoves(s, seat).length > 0 && jugadasSinSitio(s.board, s.hands[seat], s.ends, s.config.layout).length > 0) {
        casos += 1;
        const forma = juego.destrancarSiHaceFalta();
        if (forma && jugadasSinSitio(juego.state.board, juego.state.hands[seat], juego.state.ends, juego.state.config.layout).length === 0) conSitio += 1;
        if (!forma) sinTocar += 1;
        assert(!necesitaDestrancar(juego.state, seat) || juego.destrancarSiHaceFalta() === null, 'despues del reacomodo, o ya cabe todo o no se insiste');
      } else {
        juego.destrancarSiHaceFalta();
      }
      const a = juego.getCurrentPlayer();
      if (juego.getValidMoves(a.id).length) {
        const m = new Bot(juego, a.id, 'normal').chooseMove();
        if (m) { const c = m.placement || {}; juego.playTile(a.id, m.tileIndex, m.side, c.x, c.y, c.x2, c.y2, c.orientation); } else juego.pass(a.id);
      } else if (juego.hasPool && juego.pool.length) { if (!juego.drawFromPool(a.id).ok) juego.pass(a.id); } else juego.pass(a.id);
    }
  }
  assert(casos >= 1, `aparece el caso de la punta tapada (${casos} en las partidas probadas)`);
  assert(conSitio >= Math.ceil(casos * 0.6), `el reacomodo le hace sitio a la punta tapada (${conSitio} de ${casos}; ${sinTocar} sin forma que quepa)`);
}

console.log('TEST: La moderacion del salon (seccion 196)');
{
  const a = moderar('escribeme al 0414-1234567 o a www.fichas.com');
  assert(a.quitoContacto && !/0414|fichas\.com/.test(a.visible), 'telefono y enlace se quitan');
  const b = moderar('eres un pendejo pero el diputado no');
  assert(b.visible === 'eres un ******* pero el diputado no' && b.tapoGroserias, 'groseria tapada solo como palabra entera');
  assert(moderar('QUIEN JUEGA UNA PARTIDA AHORA').visible === 'quien juega una partida ahora', 'el grito se baja');
  assert(moderar('OK').visible === 'OK', 'un "OK" corto no es grito');
  const ahora = 1_000_000;
  assert(esSpam('x', { tiempos: [ahora - 1000, ahora - 2000, ahora - 3000, ahora - 4000, ahora - 5000], textos: [] }, ahora) === 'muy_seguido', 'cinco en diez segundos es spam');
  assert(esSpam('hola', { tiempos: [], textos: ['HOLA', ' hola '] }, ahora) === 'repetido', 'la tercera vez igual es repetido');
  assert(esSpam('hola', { tiempos: [], textos: ['hola', 'otra'] }, ahora) === null, 'repetir una vez es humano');
  assert(duracionSilencio(1) === 120_000 && duracionSilencio(2) === 240_000 && duracionSilencio(20) === 86_400_000, 'el silencio duplica con techo de un dia');
  assert(faltaEnPalabras(90_000) === '2 minutos' && faltaEnPalabras(3 * 86_400_000) === '3 días', 'cuanto falta, en palabras');
}

console.log('TEST: Las perillas de la casa (seccion 201, ficha 8.1)');
{
  const reloj = Config.todas().find((p) => p.clave === 'reloj.turnoMs');
  assert(reloj.valor === 25000, 'de fabrica, el turno es de 25 s');
  Config.__ponerParaPruebas('reloj.cortoMs', 9000);
  assert(RELOJ.cortoMs === 9000, 'el reloj corto sale de la perilla');
  Config.__ponerParaPruebas('reloj.graciaMs', 40000);
  assert(RELOJ.graciaMs === 40000, 'la gracia tambien');
  Config.__ponerParaPruebas('reloj.cortoMs', 15000);
  Config.__ponerParaPruebas('reloj.graciaMs', 70000);
  assert(Config.todas().every((p) => p.nombre && p.ayuda), 'toda perilla tiene nombre y ayuda en criollo');
}

console.log('TEST: Los guardianes de la tanda (seccion 201, ficha 3.3)');
{
  guardianes.__limpiarParaPruebas();
  Config.__ponerParaPruebas('guardianes.activo', true);
  for (let i = 0; i < 2; i += 1) guardianes.alModerar({ userId: 'g1', username: 'Fulano', texto: '*******', tapoGroserias: true });
  assert(guardianes.listar().length === 0, 'dos groserias todavia no encienden nada');
  guardianes.alModerar({ userId: 'g1', username: 'Fulano', texto: '*******', tapoGroserias: true });
  const a = guardianes.listar()[0];
  assert(a && /se está pasando/.test(a.titulo), `la tercera enciende la alarma: ${a?.titulo}`);
  guardianes.alModerar({ userId: 'g1', username: 'Fulano', texto: '*******', tapoGroserias: true });
  assert(guardianes.listar().length === 1, 'y descansa media hora: no suena dos veces');

  guardianes.__limpiarParaPruebas();
  guardianes.alLlegarQueja({ tipo: 'falla', username: 'Raul', texto: 'el reloj se me quedo pegado, llamen al 04141234567' });
  const q = guardianes.listar()[0];
  assert(q && /reloj/.test(q.titulo), 'una queja que menciona lo de la tanda suena en el acto');
  assert(!/04141234567/.test(q.detalle) && /…/.test(q.detalle), `los numeros largos van tapados: ${q.detalle}`);

  guardianes.__limpiarParaPruebas();
  Config.__ponerParaPruebas('guardianes.activo', false);
  guardianes.alLlegarQueja({ tipo: 'falla', username: 'Raul', texto: 'el reloj otra vez' });
  assert(guardianes.listar().length === 0, 'apagados, no encienden nada');
  Config.__ponerParaPruebas('guardianes.activo', true);
}

console.log('TEST: La libreta de la partida (seccion 201, ficha 7.2)');
{
  libreta.__limpiarParaPruebas();
  const rm = new RoomManager();
  const sala = rm.createRoom({ mode: '1v1', hostId: 'yo', hostUsername: 'Yo', armada: { casaEn: [], publica: false } });
  rm.startGame(sala.code);
  libreta.anotarDelMotor(sala.code, sala);
  const l = libreta.de(sala.code);
  assert(l && l.jugadores.length === 2, 'la libreta se abre con los que se sentaron');
  assert(l.sucesos.some((s) => /Se reparte la ronda/.test(s.texto)), 'y anota el reparto');
  libreta.anotar(sala.code, 'Se le cayó la conexión a Yo: la mesa lo espera 70 s.', 'Yo');
  libreta.cerrar(sala.code, { 1: 100, 2: 40 });
  const r = libreta.reporte(sala.code);
  assert(/LIBRETA DE LA PARTIDA/.test(r) && /EN LA MESA/.test(r) && /LO QUE PASÓ/.test(r) && /LA PLATA/.test(r), 'el reporte copiable trae sus cuatro partes');
  assert(/marcador final: 100 a 40/.test(r), 'con el marcador final');
  assert(/Se le cayó la conexión/.test(r), 'y las caidas de conexion');
  assert(libreta.listar()[0].code === sala.code, 'la partida sale en la lista del socio');
  assert(libreta.de('NOEXISTE') === null, 'una que no existe devuelve nada');
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Pasados: ${passed} | Fallados: ${failed}`);
if (failed > 0) process.exit(1);

