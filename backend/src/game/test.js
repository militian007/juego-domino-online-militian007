import { DominoGame, MODE_CONFIG } from './DominoGame.js';
import { Bot } from './Bot.js';
import { generateAllTiles, isDouble, tilePips } from './Tile.js';
import { RoomManager } from '../RoomManager.js';
import { elegirBots } from './bots.js';

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
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Pasados: ${passed} | Fallados: ${failed}`);
if (failed > 0) process.exit(1);

