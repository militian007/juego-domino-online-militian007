import { DominoGame, MODE_CONFIG } from './DominoGame.js';
import { Bot } from './Bot.js';
import { generateAllTiles, isDouble, tilePips } from './Tile.js';

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
  game.ends = { left: 0, right: 0 };
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
  game.ends = { left: 5, right: 5 };
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
  game.ends = { left: 5, right: 5 };
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
  game.ends = { left: 5, right: 5 };
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
  game.ends = { left: 5, right: 5 };
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
  game.ends = { left: 5, right: 5 };
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

  const up = placements.find(p => p.orientation === 'vertical' && p.y === 8);
  assert(up && up.x === 11 && up.y === 8 && up.x2 === 11 && up.y2 === 9, 'Opción giro arriba vertical es correcta');

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

  // Debe haber exactamente 1 opción (perpendicular vertical centrada):
  // x: 12, y: 9, x2: 12, y2: 10
  assert(placements.length === 1, 'Tiene exactamente 1 opción de colocación para el doble');
  const dOpt = placements[0];
  assert(dOpt.orientation === 'vertical', 'El doble es vertical');
  assert(dOpt.x === 12 && dOpt.y === 9 && dOpt.x2 === 12 && dOpt.y2 === 10, 'La posición vertical del doble es correcta y centrada');
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Pasados: ${passed} | Fallados: ${failed}`);
if (failed > 0) process.exit(1);

