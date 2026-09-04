import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame,
  applyAction,
  isTerminal,
  legalActions,
  viewFor,
  spectatorView,
  serialize,
  deserialize,
  PHASE,
  ACTION,
  EVENT,
  handPips,
  generateSet,
  tileKey,
  createRng,
  shuffleWithRng,
  roundSeed
} from '../src/index.js';
import { chooseAction } from '../src/bot.js';

const FORMATS_TO_TEST = ['domino-1v1-v1', 'domino-2v2-v1'];

function playToEnd(state, { maxSteps = 6000, botOpts } = {}) {
  let s = state;
  let steps = 0;
  while (s.phase !== PHASE.GAME_OVER && steps < maxSteps) {
    steps += 1;
    if (s.phase === PHASE.ROUND_OVER) {
      const r = applyAction(s, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      assert.ok(r.ok, r.error);
      s = r.state;
      continue;
    }
    const seat = s.turn;
    const view = viewFor(s, seat);
    const action = chooseAction(view, botOpts) || view.actions[0];
    assert.ok(action, 'siempre debe haber una acción legal');
    const r = applyAction(s, action);
    assert.ok(r.ok, `accion fallo: ${r.error}`);
    s = r.state;
  }
  return { state: s, steps };
}

test('rng: misma seed produce el mismo barajado', () => {
  const a = shuffleWithRng(generateSet(6), createRng(roundSeed('abc', 1)));
  const b = shuffleWithRng(generateSet(6), createRng(roundSeed('abc', 1)));
  const c = shuffleWithRng(generateSet(6), createRng(roundSeed('abc', 2)));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('createGame: reparto correcto y sin fichas repetidas', () => {
  for (const gameFormat of FORMATS_TO_TEST) {
    const s = createGame({ gameFormat, seed: 'test-seed' });
    const all = [...s.hands.flat(), ...s.pool];
    assert.equal(all.length, 28, gameFormat);
    assert.equal(new Set(all.map(tileKey)).size, 28, `${gameFormat}: fichas duplicadas`);
    for (const h of s.hands) assert.equal(h.length, 7);
    assert.equal(s.round, 1);
    assert.equal(s.phase, PHASE.PLAYING);
  }
});

test('createGame: 2v2 no tiene pozo, 1v1 si', () => {
  assert.equal(createGame({ gameFormat: 'domino-2v2-v1', seed: 's' }).pool.length, 0);
  assert.equal(createGame({ gameFormat: 'domino-1v1-v1', seed: 's' }).pool.length, 14);
});

test('createGame: misma seed produce partida identica', () => {
  const a = createGame({ gameFormat: 'domino-2v2-v1', seed: 'igual' });
  const b = createGame({ gameFormat: 'domino-2v2-v1', seed: 'igual' });
  assert.deepEqual(a.hands, b.hands);
  assert.equal(a.turn, b.turn);
});

test('sale el doble mas alto en la primera mano', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'starter-check' });
  let bestDouble = -1;
  let bestSeat = -1;
  s.hands.forEach((hand, seat) => {
    for (const t of hand) {
      if (t[0] === t[1] && t[0] > bestDouble) {
        bestDouble = t[0];
        bestSeat = seat;
      }
    }
  });
  assert.notEqual(bestDouble, -1);
  assert.equal(s.turn, bestSeat);
  assert.equal(s.starter, bestSeat);
});

test('legalActions: solo el jugador en turno tiene acciones', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'turnos' });
  for (let seat = 0; seat < 4; seat++) {
    const acts = legalActions(s, seat);
    if (seat === s.turn) assert.ok(acts.length > 0);
    else assert.equal(acts.length, 0);
  }
});

test('applyAction es puro: no muta el estado anterior', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'inmutable' });
  const snapshot = serialize(s);
  const action = legalActions(s, s.turn)[0];
  const r = applyAction(s, action);
  assert.ok(r.ok);
  assert.equal(serialize(s), snapshot, 'el estado original fue mutado');
  assert.notEqual(serialize(r.state), snapshot);
});

test('rechaza jugar fuera de turno', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'fuera-de-turno' });
  const otherSeat = (s.turn + 1) % 4;
  const r = applyAction(s, { type: ACTION.PLAY_TILE, seat: otherSeat, tileIndex: 0 });
  assert.equal(r.ok, false);
  assert.match(r.error, /turno/i);
});

test('rechaza colocacion invalida', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'coloc' });
  const r = applyAction(s, {
    type: ACTION.PLAY_TILE,
    seat: s.turn,
    tileIndex: 0,
    placement: { x: 0, y: 0, x2: 1, y2: 0, orientation: 'horizontal' }
  });
  assert.equal(r.ok, false);
});

test('rechaza pasar teniendo jugada', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'pass-invalido' });
  const r = applyAction(s, { type: ACTION.PASS, seat: s.turn });
  assert.equal(r.ok, false);
  assert.match(r.error, /no puedes pasar/i);
});

test('2v2: sin pozo no se puede robar', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'sin-pozo' });
  const r = applyAction(s, { type: ACTION.DRAW, seat: s.turn });
  assert.equal(r.ok, false);
});

test('la primera jugada deja el tablero con una ficha y ends coherentes', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'primera' });
  const action = legalActions(s, s.turn)[0];
  const { ok, state, events } = applyAction(s, action);
  assert.ok(ok);
  assert.equal(state.board.length, 1);
  assert.deepEqual(state.ends, { left: state.board[0].tile[0], right: state.board[0].tile[1] });
  assert.equal(state.hands[s.turn].length, 6);
  assert.equal(events.at(-1).kind, EVENT.PLAY_TILE);
});

test('viewFor no filtra las manos ajenas', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'privacidad' });
  const v = viewFor(s, 0);
  assert.equal(v.hand.length, 7);
  assert.deepEqual(v.handCounts, [7, 7, 7, 7]);
  assert.equal(v.revealedHands, null);
  const json = JSON.stringify(v);
  for (let seat = 1; seat < 4; seat++) {
    for (const t of s.hands[seat]) {
      const inMyHand = s.hands[0].some((m) => tileKey(m) === tileKey(t));
      if (inMyHand) continue;
      assert.equal(json.includes(JSON.stringify(t)), false, `se filtro la ficha ${tileKey(t)}`);
    }
  }
});

test('spectatorView no expone ninguna mano', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'espectador' });
  const v = spectatorView(s);
  assert.deepEqual(v.hand, []);
  assert.deepEqual(v.actions, []);
  assert.equal(v.spectator, true);
});

test('partida completa 2v2 termina con ganador y puntaje valido', () => {
  const { state, steps } = playToEnd(createGame({ gameFormat: 'domino-2v2-v1', seed: 'full-2v2' }));
  assert.equal(state.phase, PHASE.GAME_OVER);
  assert.ok(steps < 6000);
  assert.ok([1, 2].includes(state.result.winnerTeam));
  assert.ok(state.scores[state.result.winnerTeam] >= state.config.targetPoints);
  assert.equal(state.events.at(-1).kind, EVENT.GAME_END);
});

test('partida completa 1v1 con pozo termina bien', () => {
  const { state } = playToEnd(createGame({ gameFormat: 'domino-1v1-v1', seed: 'full-1v1' }));
  assert.equal(state.phase, PHASE.GAME_OVER);
  assert.ok([1, 2].includes(state.result.winnerTeam));
});

test('invariante: en toda la partida nunca hay fichas duplicadas ni perdidas', () => {
  let s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'invariante' });
  let steps = 0;
  while (s.phase !== PHASE.GAME_OVER && steps < 6000) {
    steps += 1;
    const all = [...s.hands.flat(), ...s.pool, ...s.board.map((b) => b.tile)];
    assert.equal(all.length, 28, `paso ${steps}: hay ${all.length} fichas`);
    assert.equal(new Set(all.map(tileKey)).size, 28, `paso ${steps}: fichas duplicadas`);
    if (s.phase === PHASE.ROUND_OVER) {
      s = applyAction(s, { type: ACTION.START_NEXT_ROUND, seat: 0 }).state;
      continue;
    }
    const v = viewFor(s, s.turn);
    s = applyAction(s, chooseAction(v) || v.actions[0]).state;
  }
});

test('invariante: ninguna ficha del tablero se solapa visualmente', () => {
  let s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'solape' });
  const cell = s.config.layout.cell;
  let steps = 0;
  while (s.phase !== PHASE.GAME_OVER && steps < 4000) {
    steps += 1;
    if (s.phase === PHASE.ROUND_OVER) {
      s = applyAction(s, { type: ACTION.START_NEXT_ROUND, seat: 0 }).state;
      continue;
    }
    const v = viewFor(s, s.turn);
    s = applyAction(s, chooseAction(v) || v.actions[0]).state;

    const cells = new Set();
    for (const t of s.board) {
      for (const key of [`${t.x},${t.y}`, `${t.x2},${t.y2}`]) {
        assert.equal(cells.has(key), false, `celda ocupada dos veces: ${key}`);
        cells.add(key);
      }
      assert.ok(t.x >= 0 && t.x < s.config.layout.grid, 'ficha fuera del grid');
      assert.ok(t.y >= 0 && t.y < s.config.layout.grid, 'ficha fuera del grid');
    }
    assert.ok(cell > 0);
  }
});

test('ROUND_END por domino: el ganador suma los pips de los rivales', () => {
  let s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'ronda-domino' });
  let guard = 0;
  while (s.phase === PHASE.PLAYING && guard < 200) {
    guard += 1;
    const v = viewFor(s, s.turn);
    s = applyAction(s, chooseAction(v) || v.actions[0]).state;
  }
  const end = s.events.filter((e) => e.kind === EVENT.ROUND_END).at(-1);
  assert.ok(end, 'no se emitio ROUND_END');
  if (end.reason === 'domino') {
    const rivals = end.hands.filter((_, seat) => s.teams[seat] !== end.winnerTeam);
    assert.equal(end.points, rivals.reduce((acc, h) => acc + handPips(h), 0));
    assert.equal(s.hands[end.winnerSeat].length, 0);
  } else {
    assert.equal(end.reason, 'blocked');
  }
  assert.equal(s.scores[end.winnerTeam], end.points);
});

test('siguiente ronda: arranca el ganador de la anterior y sube el contador', () => {
  let s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'siguiente-ronda' });
  let guard = 0;
  while (s.phase === PHASE.PLAYING && guard < 200) {
    guard += 1;
    const v = viewFor(s, s.turn);
    s = applyAction(s, chooseAction(v) || v.actions[0]).state;
  }
  assert.equal(s.phase, PHASE.ROUND_OVER);
  const expectedStarter = s.lastRound.winnerSeat;
  const r = applyAction(s, { type: ACTION.START_NEXT_ROUND, seat: 0 });
  assert.ok(r.ok);
  assert.equal(r.state.round, 2, 'el contador de ronda no avanzo');
  assert.equal(r.state.phase, PHASE.PLAYING);
  assert.equal(r.state.board.length, 0);
  if (expectedStarter != null) assert.equal(r.state.turn, expectedStarter);
});

test('TIMEOUT juega automaticamente por el jugador', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'timeout' });
  const seat = s.turn;
  const r = applyAction(s, { type: ACTION.TIMEOUT, seat });
  assert.ok(r.ok, r.error);
  assert.equal(r.state.board.length, 1);
  assert.equal(r.state.hands[seat].length, 6);
  assert.equal(r.events[0].kind, EVENT.TIMEOUT);
});

test('FORFEIT termina la partida a favor del equipo contrario', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'abandono' });
  const r = applyAction(s, { type: ACTION.FORFEIT, seat: 1 });
  assert.ok(r.ok);
  assert.equal(r.state.phase, PHASE.GAME_OVER);
  assert.equal(r.state.result.winnerTeam, 1);
  assert.equal(r.state.result.reason, 'forfeit');
  assert.equal(r.state.forfeited[1], true);
  assert.equal(legalActions(r.state, 0).length, 0);
});

test('targetPoints es configurable', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'target', config: { targetPoints: 30 } });
  assert.equal(s.config.targetPoints, 30);
  const { state } = playToEnd(s);
  assert.ok(state.scores[state.result.winnerTeam] >= 30);
  assert.ok(state.scores[state.result.winnerTeam] < 30 + 100);
});

test('estado serializable ida y vuelta', () => {
  let s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'serial' });
  for (let i = 0; i < 5; i++) {
    const v = viewFor(s, s.turn);
    s = applyAction(s, chooseAction(v) || v.actions[0]).state;
  }
  const restored = deserialize(serialize(s));
  assert.deepEqual(restored, s);
  const a = legalActions(restored, restored.turn);
  const b = legalActions(s, s.turn);
  assert.deepEqual(a, b);
});

test('deserialize rechaza versiones incompatibles', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'version' });
  s.version = 99;
  assert.throws(() => deserialize(serialize(s)), /incompatible/i);
});

test('el bot solo usa la vista: no toca hands ni pool', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'bot-limpio' });
  const v = viewFor(s, s.turn);
  assert.equal('hands' in v, false);
  assert.equal('pool' in v, false);
  const a = chooseAction(v);
  assert.ok(a);
  assert.ok(legalActions(s, s.turn).some((x) => JSON.stringify(x) === JSON.stringify(a)));
});

test('el bot es determinista con la misma seed', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'bot-determinista' });
  const v = viewFor(s, s.turn);
  assert.deepEqual(chooseAction(v, { seed: 'x' }), chooseAction(v, { seed: 'x' }));
});

test('el bot dificil le gana al facil en la mayoria de partidas', () => {
  let hardWins = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    let s = createGame({ gameFormat: 'domino-2v2-v1', seed: `duelo-${i}`, config: { targetPoints: 50 } });
    let guard = 0;
    while (s.phase !== PHASE.GAME_OVER && guard < 4000) {
      guard += 1;
      if (s.phase === PHASE.ROUND_OVER) {
        s = applyAction(s, { type: ACTION.START_NEXT_ROUND, seat: 0 }).state;
        continue;
      }
      const v = viewFor(s, s.turn);
      const difficulty = s.teams[s.turn] === 1 ? 'hard' : 'easy';
      s = applyAction(s, chooseAction(v, { difficulty, seed: `${i}-${s.seq}` }) || v.actions[0]).state;
    }
    if (s.result?.winnerTeam === 1) hardWins += 1;
  }
  assert.ok(hardWins >= N * 0.6, `el bot dificil gano ${hardWins}/${N}`);
});

test('todos los gameFormats declarados arrancan sin error', () => {
  for (const gameFormat of ['domino-1v1-v1', 'domino-1v1bot-v1', 'domino-2v2-v1', 'domino-2v2bots-v1']) {
    const s = createGame({ gameFormat, seed: 'formatos' });
    assert.equal(s.phase, PHASE.PLAYING);
    assert.ok(legalActions(s, s.turn).length > 0, gameFormat);
  }
});

test('gameFormat desconocido lanza error claro', () => {
  assert.throws(() => createGame({ gameFormat: 'truco-1v1' }), /gameFormat desconocido/);
});

import { placementsFor, boardEnds, straightestPlacement } from '../src/layout.js';

const L = { grid: 20, cell: 32 };

test('borde: doble vertical pegado al borde izquierdo ofrece arriba Y abajo', () => {
  const board = [
    { tile: [2, 2], side: 'left', x: 1, y: 9, x2: 1, y2: 10, orientation: 'vertical' },
    { tile: [2, 5], side: 'first', x: 2, y: 10, x2: 3, y2: 10, orientation: 'horizontal' },
    { tile: [5, 4], side: 'right', x: 4, y: 10, x2: 5, y2: 10, orientation: 'horizontal' }
  ];
  const ops = placementsFor(board, [2, 6], 'left', L);
  assert.equal(ops.length, 2, 'deberia ofrecer las dos direcciones del borde');
  assert.ok(ops.every((p) => p.orientation === 'vertical'));
  assert.ok(ops.some((p) => Math.min(p.y, p.y2) < 9), 'falta la opcion hacia arriba');
  assert.ok(ops.some((p) => Math.min(p.y, p.y2) > 10), 'falta la opcion hacia abajo');
  for (const p of ops) {
    assert.equal(p.tile[1], 2, 'la mitad que conecta debe ser el valor del extremo');
    assert.equal(boardEnds([p, ...board]).left, 6, 'el nuevo extremo izquierdo debe ser 6');
  }
});

test('borde: doble vertical pegado al borde derecho ofrece arriba Y abajo', () => {
  const board = [
    { tile: [4, 5], side: 'first', x: 16, y: 10, x2: 17, y2: 10, orientation: 'horizontal' },
    { tile: [5, 5], side: 'right', x: 18, y: 10, x2: 18, y2: 11, orientation: 'vertical' }
  ];
  const ops = placementsFor(board, [5, 2], 'right', L);
  assert.equal(ops.length, 2);
  assert.ok(ops.some((p) => Math.min(p.y, p.y2) < 10), 'falta hacia arriba');
  assert.ok(ops.some((p) => Math.min(p.y, p.y2) > 11), 'falta hacia abajo');
  for (const p of ops) {
    assert.equal(p.tile[0], 5, 'la mitad que conecta debe ser el valor del extremo');
    assert.equal(boardEnds([...board, p]).right, 2);
  }
});

test('borde: doble horizontal en la fila superior ofrece izquierda Y derecha', () => {
  const board = [
    { tile: [3, 6], side: 'first', x: 6, y: 3, x2: 6, y2: 2, orientation: 'vertical' },
    { tile: [6, 6], side: 'right', x: 6, y: 1, x2: 7, y2: 1, orientation: 'horizontal' }
  ];
  const ops = placementsFor(board, [6, 4], 'right', L);
  assert.equal(ops.length, 2);
  assert.ok(ops.every((p) => p.orientation === 'horizontal'));
  assert.ok(ops.some((p) => Math.min(p.x, p.x2) < 6), 'falta hacia la izquierda');
  assert.ok(ops.some((p) => Math.min(p.x, p.x2) > 7), 'falta hacia la derecha');
  for (const p of ops) assert.equal(boardEnds([...board, p]).right, 4);
});

test('doble: la cadena puede salir por cualquiera de sus costados', () => {
  const board = [
    { tile: [4, 5], side: 'first', x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal' },
    { tile: [5, 5], side: 'right', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  const ops = placementsFor(board, [5, 2], 'right', L);
  assert.ok(ops.length >= 2, 'un doble no puede tener una sola salida');
  assert.ok(ops.every((p) => p.tile[0] === 5), 'la mitad que conecta va pegada al doble');
  assert.ok(ops.every((p) => boardEnds([...board, p]).right === 2));
});

test('doble: si el costado natural esta tapado, el otro sirve', () => {
  // Caso real medido: la cadena viene por la fila 18 hacia la izquierda y
  // termina en el doble [3|3] parado en la columna 5. La salida hacia la
  // derecha esta pegada a la cadena, pero a la izquierda hay sitio de sobra.
  // Antes el motor solo miraba la derecha y la ficha quedaba injugable.
  const board = [
    { tile: [1, 1], side: 'right', x: 9, y: 18, x2: 8, y2: 18, orientation: 'horizontal' },
    { tile: [1, 3], side: 'right', x: 7, y: 18, x2: 6, y2: 18, orientation: 'horizontal' },
    { tile: [3, 3], side: 'right', x: 5, y: 18, x2: 5, y2: 17, orientation: 'vertical' }
  ];
  const ops = placementsFor(board, [0, 3], 'right', L);
  assert.ok(ops.length > 0, 'teniendo el 3 tiene que haber donde ponerlo');
  assert.ok(
    ops.some((p) => Math.max(p.x, p.x2) < 5),
    'tiene que ofrecer la salida por la izquierda del doble'
  );
});

test('las dos opciones de borde son jugables de verdad por el motor', () => {
  const state = createGame({ gameFormat: 'domino-1v1-v1', seed: 'borde-jugable' });
  state.board = [
    { tile: [2, 2], side: 'left', x: 1, y: 9, x2: 1, y2: 10, orientation: 'vertical' },
    { tile: [2, 5], side: 'first', x: 2, y: 10, x2: 3, y2: 10, orientation: 'horizontal' }
  ];
  state.ends = boardEnds(state.board);
  state.hands[0] = [[2, 6]];
  state.hands[1] = [[0, 1]];
  state.turn = 0;

  const acciones = legalActions(state, 0).filter((a) => a.side === 'left');
  assert.equal(acciones.length, 2, 'el jugador debe ver las dos opciones');

  for (const a of acciones) {
    const r = applyAction(state, a);
    assert.ok(r.ok, `la opcion ${JSON.stringify(a.placement)} deberia ser jugable: ${r.error}`);
    assert.equal(r.state.ends.left, 6);
    const celdas = new Set();
    for (const t of r.state.board) {
      for (const k of [`${t.x},${t.y}`, `${t.x2},${t.y2}`]) {
        assert.equal(celdas.has(k), false, 'colocacion solapada');
        celdas.add(k);
      }
    }
  }
});

test('recta: la direccion sale de la punta libre, no del lado de la cadena', () => {
  // Extremo izquierdo cuya punta libre apunta a la DERECHA (la cadena viene desde la izquierda)
  const board = [
    { tile: [5, 6], side: 'left', x: 11, y: 5, x2: 10, y2: 5, orientation: 'horizontal' },
    { tile: [6, 3], side: 'first', x: 9, y: 5, x2: 9, y2: 6, orientation: 'vertical' }
  ];
  const ops = placementsFor(board, [5, 0], 'left', L);
  const recta = ops.filter((p) => p.orientation === 'horizontal');
  assert.equal(recta.length, 1, 'debe existir la opcion recta');
  assert.deepEqual(
    { x: recta[0].x, y: recta[0].y, x2: recta[0].x2, y2: recta[0].y2 },
    { x: 13, y: 5, x2: 12, y2: 5 },
    'la recta debe seguir hacia la derecha, que es donde apunta la punta libre'
  );
  assert.equal(recta[0].tile[1], 5, 'la mitad que conecta va pegada al extremo');
  assert.equal(boardEnds([recta[0], ...board]).left, 0);
});

test('recta: extremo vertical cuya punta libre apunta hacia abajo', () => {
  const board = [
    { tile: [2, 4], side: 'first', x: 8, y: 8, x2: 9, y2: 8, orientation: 'horizontal' },
    { tile: [4, 6], side: 'right', x: 10, y: 8, x2: 10, y2: 9, orientation: 'vertical' }
  ];
  const ops = placementsFor(board, [6, 1], 'right', L);
  const recta = ops.filter((p) => p.orientation === 'vertical');
  assert.equal(recta.length, 1);
  assert.deepEqual(
    { x: recta[0].x, y: recta[0].y, x2: recta[0].x2, y2: recta[0].y2 },
    { x: 10, y: 10, x2: 10, y2: 11 },
    'debe continuar hacia abajo'
  );
});

test('amontonamiento: una ficha nueva no puede tocar otra que no sea su enganche', () => {
  // Cadena en U: el hueco de abajo a la izquierda tocaria dos fichas a la vez
  const board = [
    { tile: [1, 2], side: 'first', x: 8, y: 8, x2: 9, y2: 8, orientation: 'horizontal' },
    { tile: [2, 3], side: 'right', x: 10, y: 8, x2: 10, y2: 9, orientation: 'vertical' },
    { tile: [3, 4], side: 'right', x: 10, y: 10, x2: 9, y2: 10, orientation: 'horizontal' },
    { tile: [4, 5], side: 'right', x: 8, y: 10, x2: 7, y2: 10, orientation: 'horizontal' }
  ];
  const ops = placementsFor(board, [5, 6], 'right', L);
  const ownerOf = new Map();
  board.forEach((t, i) => {
    ownerOf.set(`${t.x},${t.y}`, i);
    ownerOf.set(`${t.x2},${t.y2}`, i);
  });
  for (const p of ops) {
    for (const [cx, cy] of [[p.x, p.y], [p.x2, p.y2]]) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const owner = ownerOf.get(`${cx + dx},${cy + dy}`);
        assert.ok(
          owner === undefined || owner === board.length - 1,
          `la opcion ${p.orientation}(${p.x},${p.y}) roza la ficha ${owner}, se amontona`
        );
      }
    }
  }
});

test('amontonamiento: rozar es raro, y nunca se montan ni se salen', () => {
  // Este test afirmaba que dos fichas NUNCA se tocan fuera de la cadena. Dejo
  // de ser cierto a proposito: la pasada de rescate (ver placementsFor) permite
  // rozar cuando la ficha no tendria ningun otro sitio, porque dejar al jugador
  // trancado teniendo la ficha es peor que una ficha pegada.
  //
  // Lo que si tiene que seguir siendo cierto, y es lo que se comprueba aca:
  // rozar es RARO, y montarse o salirse del tablero no pasa nunca.
  let posiciones = 0;
  let conRoce = 0;

  for (const fmt of ['domino-1v1-v1', 'domino-2v2-v1']) {
    let s = createGame({ gameFormat: fmt, seed: `contacto-${fmt}`, config: { targetPoints: 60 } });
    let g = 0;
    while (s.phase !== PHASE.GAME_OVER && g < 4000) {
      g += 1;
      if (s.phase === PHASE.ROUND_OVER) {
        s = applyAction(s, { type: ACTION.START_NEXT_ROUND, seat: 0 }).state;
        continue;
      }
      const v = viewFor(s, s.turn);
      s = applyAction(s, chooseAction(v) || v.actions[0]).state;
      if (s.board.length < 2) continue;
      posiciones += 1;

      for (const t of s.board) {
        for (const c of [[t.x, t.y], [t.x2, t.y2]]) {
          assert.ok(c[0] >= 0 && c[0] < 20 && c[1] >= 0 && c[1] < 20, 'ninguna ficha se sale del tablero');
        }
      }

      const owner = new Map();
      s.board.forEach((t, i) => {
        for (const c of [`${t.x},${t.y}`, `${t.x2},${t.y2}`]) {
          assert.equal(owner.has(c), false, `las fichas ${owner.get(c)} y ${i} se montan en ${c}`);
          owner.set(c, i);
        }
      });

      let roza = false;
      s.board.forEach((t, i) => {
        for (const [cx, cy] of [[t.x, t.y], [t.x2, t.y2]]) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const o = owner.get(`${cx + dx},${cy + dy}`);
            if (o !== undefined && o !== i && Math.abs(o - i) !== 1) roza = true;
          }
        }
      });
      if (roza) conRoce += 1;
    }
  }

  // Medido sobre 200 partidas por formato: 2 de cada 100 posiciones. Se deja el
  // limite en 10% para que el test avise si alguna vez se dispara.
  const porcentaje = (conRoce / posiciones) * 100;
  assert.ok(
    porcentaje < 10,
    `rozar tiene que seguir siendo raro, y va por el ${porcentaje.toFixed(1)}% de las posiciones`
  );
});

test('pozo: el jugador elige que ficha levanta', () => {
  let s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'pozo-elegir' });
  s.hands[0] = [[0, 1]];
  s.hands[1] = [[2, 3]];
  s.board = [
    { tile: [5, 5], side: 'first', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  s.ends = boardEnds(s.board);
  s.turn = 0;

  const pozoAntes = s.pool.map((t) => t.join('-'));
  const acciones = legalActions(s, 0);
  assert.equal(acciones.length, 1);
  assert.equal(acciones[0].type, ACTION.DRAW);
  assert.equal(acciones[0].poolCount, s.pool.length, 'la accion debe decir cuantas hay');

  // levantar la posicion 3 tiene que dar exactamente esa ficha
  const esperada = s.pool[3];
  const r = applyAction(s, { type: ACTION.DRAW, seat: 0, poolIndex: 3 });
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.state.hands[0].at(-1), esperada);
  assert.equal(r.state.pool.length, s.pool.length - 1);
  assert.equal(r.events[0].poolIndex, 3);

  // el resto del pozo queda intacto y en orden
  const pozoDespues = r.state.pool.map((t) => t.join('-'));
  assert.deepEqual(pozoDespues, pozoAntes.filter((_, i) => i !== 3));
});

test('pozo: sin poolIndex se levanta la ultima, como antes', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'pozo-default' });
  s.hands[0] = [[0, 1]];
  s.board = [
    { tile: [5, 5], side: 'first', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  s.ends = boardEnds(s.board);
  s.turn = 0;
  const ultima = s.pool.at(-1);
  const r = applyAction(s, { type: ACTION.DRAW, seat: 0 });
  assert.ok(r.ok);
  assert.deepEqual(r.state.hands[0].at(-1), ultima);
});

test('pozo: rechaza una posicion que no existe', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'pozo-fuera' });
  s.hands[0] = [[0, 1]];
  s.board = [
    { tile: [5, 5], side: 'first', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  s.ends = boardEnds(s.board);
  s.turn = 0;
  for (const i of [-1, 14, 99]) {
    const r = applyAction(s, { type: ACTION.DRAW, seat: 0, poolIndex: i });
    assert.equal(r.ok, false, `poolIndex ${i} deberia ser invalido`);
  }
});

test('pozo: el orden se fija una sola vez al repartir y no cambia', () => {
  const a = createGame({ gameFormat: 'domino-1v1-v1', seed: 'pozo-fijo' });
  const b = createGame({ gameFormat: 'domino-1v1-v1', seed: 'pozo-fijo' });
  assert.deepEqual(a.pool, b.pool, 'misma seed, mismo pozo');

  // jugar no reordena el pozo
  let s = a;
  for (let i = 0; i < 6 && s.phase === PHASE.PLAYING; i++) {
    const v = viewFor(s, s.turn);
    const r = applyAction(s, chooseAction(v) || v.actions[0]);
    if (!r.ok) break;
    const antes = s.pool.map((t) => t.join('-'));
    const despues = r.state.pool.map((t) => t.join('-'));
    // solo puede faltar una ficha (si robo), el resto conserva el orden
    assert.deepEqual(despues, antes.filter((t) => despues.includes(t)));
    s = r.state;
  }
});

test('pozo: la vista nunca revela que fichas hay en el pozo', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'pozo-secreto' });
  const v = viewFor(s, 0);
  assert.equal(v.poolCount, 14);
  assert.equal('pool' in v, false);
  const json = JSON.stringify(v);
  for (const t of s.pool) {
    const enMiMano = s.hands[0].some((m) => tileKey(m) === tileKey(t));
    if (enMiMano) continue;
    assert.equal(json.includes(JSON.stringify(t)), false, `se filtro la ficha ${tileKey(t)} del pozo`);
  }
});

/**
 * ¿El doble quedo EN LINEA con la ficha con la que engancha?
 *
 * Esta es la regla que Jonathan marco con una captura: un doble acostado
 * siguiendo la cadena no existe en una mesa de verdad. Antes se comprobaba
 * mirando solo la orientacion, pero eso dejo de valer cuando el doble pudo
 * doblar en la punta: al costado puede tener la MISMA orientacion que la
 * cadena y estar perfectamente cruzado. Lo que no puede es ir detras, en la
 * misma fila o columna.
 */
const enLineaCon = (ficha, p) => {
  if (ficha.orientation !== p.orientation) return false;
  return ficha.orientation === 'vertical'
    ? Math.min(ficha.x, ficha.x2) === Math.min(p.x, p.x2)
    : Math.min(ficha.y, ficha.y2) === Math.min(p.y, p.y2);
};

test('doble: puede cruzarse hacia cualquiera de los dos lados de la cadena', () => {
  const board = [
    { tile: [2, 4], side: 'first', x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal' }
  ];
  const ops = placementsFor(board, [4, 4], 'right', L);
  assert.ok(ops.every((p) => !enLineaCon(board[0], p)), 'un doble jamas va en linea');

  // Pasando la punta, cruzado, en la columna siguiente: las dos.
  const pasandoLaPunta = ops.filter((p) => p.orientation === 'vertical' && p.x === 10 && p.x2 === 10);
  assert.equal(pasandoLaPunta.length, 2, 'un doble se cruza hacia los dos lados');
  assert.ok(pasandoLaPunta.some((p) => Math.min(p.y, p.y2) === 9), 'falta la que sobresale hacia arriba');
  assert.ok(pasandoLaPunta.some((p) => Math.min(p.y, p.y2) === 10), 'falta la que sobresale hacia abajo');
});

test('doble: si una posicion cruzada esta tapada, la otra sigue disponible', () => {
  // Cadena en U: la vuelta de arriba tapa la posicion alta del doble
  const board = [
    { tile: [4, 1], side: 'left', x: 12, y: 8, x2: 11, y2: 8, orientation: 'horizontal' },
    { tile: [1, 2], side: 'left', x: 10, y: 8, x2: 9, y2: 8, orientation: 'horizontal' },
    { tile: [2, 0], side: 'left', x: 8, y: 8, x2: 7, y2: 8, orientation: 'horizontal' },
    { tile: [0, 1], side: 'first', x: 6, y: 8, x2: 6, y2: 9, orientation: 'vertical' },
    { tile: [1, 5], side: 'right', x: 6, y: 10, x2: 7, y2: 10, orientation: 'horizontal' },
    { tile: [5, 4], side: 'right', x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal' },
    { tile: [4, 6], side: 'right', x: 10, y: 10, x2: 11, y2: 10, orientation: 'horizontal' }
  ];
  const ops = placementsFor(board, [6, 6], 'right', L);
  const ultima = board[board.length - 1];

  const pasandoLaPunta = ops.filter((p) => p.orientation === 'vertical' && p.x === 12);
  assert.equal(pasandoLaPunta.length, 1, 'la de arriba toca la vuelta, la de abajo entra');
  assert.equal(Math.min(pasandoLaPunta[0].y, pasandoLaPunta[0].y2), 10, 'debe ser la que sobresale hacia abajo');
  assert.ok(ops.every((p) => !enLineaCon(ultima, p)), 'ninguna puede ir en linea');
  assert.equal(boardEnds([...board, ops[0]]).right, 6);
});

test('doble en el medio: sigue siendo perpendicular, nunca en linea', () => {
  const board = [
    { tile: [2, 4], side: 'first', x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal' }
  ];
  for (const p of placementsFor(board, [4, 4], 'right', L)) {
    assert.ok(!enLineaCon(board[0], p), 'un doble jamas va en linea');
  }
});

test('tranque: el ganador suma los pips del rival, no la diferencia', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'tranque-puntos' });
  s.hands[0] = [[4, 4], [6, 6]];   // 20 pips
  s.hands[1] = [[5, 5], [1, 1]];   // 12 pips
  s.pool = [];
  s.board = [
    { tile: [3, 3], side: 'first', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  s.ends = boardEnds(s.board);
  s.turn = 0;

  const r1 = applyAction(s, { type: ACTION.PASS, seat: 0 });
  assert.ok(r1.ok, r1.error);
  const r2 = applyAction(r1.state, { type: ACTION.PASS, seat: 1 });
  assert.ok(r2.ok, r2.error);

  const fin = r2.state.lastRound;
  assert.equal(fin.reason, 'blocked');
  assert.equal(fin.winnerTeam, 2, 'gana el que tiene menos pips');
  assert.equal(fin.points, 20, 'suma los 20 pips del rival, no la diferencia de 8');
  assert.equal(r2.state.scores[2], 20);
  assert.equal(r2.state.scores[1], 0);
});

test('tranque: la variante "difference" sigue disponible por config', () => {
  const s = createGame({
    gameFormat: 'domino-1v1-v1',
    seed: 'tranque-dif',
    config: { blockedScoring: 'difference' }
  });
  s.hands[0] = [[4, 4], [6, 6]];
  s.hands[1] = [[5, 5], [1, 1]];
  s.pool = [];
  s.board = [
    { tile: [3, 3], side: 'first', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  s.ends = boardEnds(s.board);
  s.turn = 0;
  const r = applyAction(applyAction(s, { type: ACTION.PASS, seat: 0 }).state, { type: ACTION.PASS, seat: 1 });
  assert.equal(r.state.lastRound.points, 8, '20 - 12 = 8');
});

test('tranque: empate de pips no suma a nadie', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'tranque-empate' });
  s.hands[0] = [[6, 6]];
  s.hands[1] = [[5, 4], [2, 1]];   // 12 pips los dos
  s.pool = [];
  s.board = [
    { tile: [3, 3], side: 'first', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  s.ends = boardEnds(s.board);
  s.turn = 0;
  const r = applyAction(applyAction(s, { type: ACTION.PASS, seat: 0 }).state, { type: ACTION.PASS, seat: 1 });
  assert.equal(r.state.lastRound.winnerTeam, null);
  assert.equal(r.state.lastRound.points, 0);
});

test('domino: el ganador suma los pips que quedan en las manos rivales', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'domino-puntos' });
  s.hands[0] = [[3, 5]];
  s.hands[1] = [[4, 4], [6, 6]];   // 20 pips
  s.board = [
    { tile: [3, 3], side: 'first', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  s.ends = boardEnds(s.board);
  s.turn = 0;

  const jugada = legalActions(s, 0).find((a) => a.type === ACTION.PLAY_TILE);
  assert.ok(jugada, 'el 3-5 tiene que poder jugarse en el 3');
  const r = applyAction(s, jugada);
  assert.ok(r.ok, r.error);

  const fin = r.state.lastRound;
  assert.equal(fin.reason, 'domino');
  assert.equal(fin.winnerSeat, 0);
  assert.equal(fin.points, 20, 'los 20 pips que le quedaron al rival');
});

test('bots: los cinco niveles existen y forman una escalera', () => {
  const niveles = ['novato', 'facil', 'normal', 'dificil', 'maestro'];
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'niveles' });
  const v = viewFor(s, s.turn);
  for (const d of niveles) {
    assert.ok(chooseAction(v, { difficulty: d }), `${d} deberia elegir una accion`);
  }

  // el maestro le gana al novato de forma clara
  let ganaMaestro = 0;
  const N = 60;
  for (let i = 0; i < N; i++) {
    let e = createGame({ gameFormat: 'domino-2v2-v1', seed: `esc-${i}`, config: { targetPoints: 50 } });
    let g = 0;
    while (e.phase !== PHASE.GAME_OVER && g < 4000) {
      g += 1;
      if (e.phase === PHASE.ROUND_OVER) {
        e = applyAction(e, { type: ACTION.START_NEXT_ROUND, seat: 0 }).state;
        continue;
      }
      const vista = viewFor(e, e.turn);
      const dificultad = e.teams[e.turn] === 1 ? 'maestro' : 'novato';
      e = applyAction(e, chooseAction(vista, { difficulty: dificultad, seed: `${i}-${e.seq}` }) || vista.actions[0]).state;
    }
    if (e.result?.winnerTeam === 1) ganaMaestro += 1;
  }
  assert.ok(ganaMaestro >= N * 0.6, `el maestro gano ${ganaMaestro}/${N} contra el novato`);
});

test('bots: una dificultad desconocida no rompe, cae en normal', () => {
  const s = createGame({ gameFormat: 'domino-2v2-v1', seed: 'nivel-raro' });
  const v = viewFor(s, s.turn);
  const a = chooseAction(v, { difficulty: 'inventada' });
  assert.ok(a, 'deberia devolver una accion igual');
  assert.ok(v.actions.some((x) => JSON.stringify(x) === JSON.stringify(a)), 'y ser legal');
});

test('doble contra el borde: entra doblando, y NUNCA en linea', () => {
  // La cadena sube y su punta libre queda en la fila 0. Cruzarse mas alla de la
  // punta caeria fuera de la mesa.
  //
  // Antes esto era una jugada bloqueada: el doble solo se ofrecia pasando la
  // punta, asi que contra la pared no habia sitio y quedaba injugable teniendo
  // lugar de sobra al lado. Lo reporto Jonathan con una captura: "no me deja
  // poner el doble cero, solo me deja poner el cero tres".
  //
  // Ahora el doble tambien puede DOBLAR en la punta, igual que una ficha
  // normal. Lo que sigue prohibido es que quede en linea con la cadena, que es
  // el doble acostado que el mismo marco como imposible en una mesa de verdad.
  const board = [
    { tile: [5, 4], side: 'first', x: 9, y: 4, x2: 9, y2: 3, orientation: 'vertical' },
    { tile: [4, 2], side: 'right', x: 9, y: 2, x2: 9, y2: 1, orientation: 'vertical' },
    { tile: [2, 3], side: 'right', x: 9, y: 1, x2: 9, y2: 0, orientation: 'vertical' }
  ];
  const ops = placementsFor(board, [3, 3], 'right', L);
  const ultima = board[board.length - 1];

  assert.ok(ops.length > 0, 'contra la pared el doble tiene que poder doblar');
  assert.ok(
    ops.every((p) => !enLineaCon(ultima, p)),
    'el doble nunca puede quedar en linea con la cadena'
  );
  assert.ok(
    ops.every((p) => Math.min(p.y, p.y2) >= 0),
    'ninguna opcion puede salirse de la mesa'
  );
  assert.ok(ops.every((p) => p.tile[0] === 3 && p.tile[1] === 3));
});

test('doble en pasillo estrecho: si una ficha normal entra, el doble tambien', () => {
  // El caso que reporto el usuario el 2026-09-01: veia sitio de sobra, jugaba
  // una ficha normal ahi mismo, y el doble no lo dejaba. La cadena deja un
  // pasillo de una celda entre dos filas: la normal va acostada y no toca nada,
  // el doble se cruza, sobresale, y la regla de "no rozar" lo rechazaba.
  const board = [
    { tile: [1, 4], x: 4, y: 8, x2: 3, y2: 8, orientation: 'horizontal', side: 'left' },
    { tile: [4, 2], x: 2, y: 8, x2: 2, y2: 9, orientation: 'vertical', side: 'right' },
    { tile: [2, 6], x: 2, y: 10, x2: 3, y2: 10, orientation: 'horizontal', side: 'right' },
    { tile: [6, 3], x: 4, y: 10, x2: 5, y2: 10, orientation: 'horizontal', side: 'right' },
    { tile: [3, 4], x: 6, y: 10, x2: 7, y2: 10, orientation: 'horizontal', side: 'right' },
    { tile: [4, 6], x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal', side: 'right' },
    { tile: [6, 6], x: 10, y: 10, x2: 11, y2: 10, orientation: 'horizontal', side: 'right' },
    { tile: [6, 5], x: 12, y: 10, x2: 13, y2: 10, orientation: 'horizontal', side: 'right' },
    { tile: [5, 5], x: 14, y: 10, x2: 14, y2: 9, orientation: 'vertical', side: 'right' },
    { tile: [5, 4], x: 14, y: 8, x2: 14, y2: 7, orientation: 'vertical', side: 'right' },
    { tile: [4, 4], x: 14, y: 6, x2: 13, y2: 6, orientation: 'horizontal', side: 'right' },
    { tile: [4, 0], x: 12, y: 6, x2: 11, y2: 6, orientation: 'horizontal', side: 'right' },
    { tile: [0, 5], x: 10, y: 6, x2: 9, y2: 6, orientation: 'horizontal', side: 'right' },
    { tile: [5, 2], x: 8, y: 6, x2: 7, y2: 6, orientation: 'horizontal', side: 'right' },
    { tile: [2, 1], x: 6, y: 6, x2: 5, y2: 6, orientation: 'horizontal', side: 'right' },
    { tile: [1, 3], x: 4, y: 6, x2: 3, y2: 6, orientation: 'horizontal', side: 'right' },
    { tile: [3, 3], x: 2, y: 6, x2: 2, y2: 5, orientation: 'vertical', side: 'right' },
    { tile: [3, 2], x: 2, y: 4, x2: 2, y2: 3, orientation: 'vertical', side: 'right' }
  ];

  const normal = placementsFor(board, [1, 0], 'left');
  assert.ok(normal.length > 0, 'la ficha normal 1|0 tiene que entrar por la izquierda');

  const doble = placementsFor(board, [1, 1], 'left');
  assert.ok(doble.length > 0, 'si la normal entra, el doble 1|1 tambien tiene que entrar');

  // El rescate relaja rozar, nunca solapar ni salirse del tablero.
  for (const p of doble) {
    for (const c of [[p.x, p.y], [p.x2, p.y2]]) {
      assert.ok(c[0] >= 0 && c[0] < 20 && c[1] >= 0 && c[1] < 20, 'no puede salirse del tablero');
      assert.ok(
        !board.some((t) => (t.x === c[0] && t.y === c[1]) || (t.x2 === c[0] && t.y2 === c[1])),
        'no puede caer sobre una ficha puesta'
      );
    }
  }
});

test('la cadena sale CRUZADA de un doble, no de pie en la misma fila', () => {
  // El usuario, 2026-09-02: "se ve que el 6 tiene la logica pero se puso mal,
  // se puso en paralelo o de pie en vez de acostado". Un doble va acostado
  // sobre la cadena; si la cadena sigue por el eje del propio doble, el doble
  // queda en linea y parece una ficha mas de la fila.
  const doble = [
    { tile: [2, 2], x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical', side: 'first' }
  ];

  const opciones = placementsFor(doble, [2, 5], 'right');
  assert.ok(opciones.length > 0, 'algo tiene que poder engancharse al doble');

  const elegida = straightestPlacement(doble, opciones, 'right');
  assert.equal(
    elegida.orientation,
    'horizontal',
    'de un doble vertical la cadena tiene que salir horizontal, cruzada'
  );

  // Y al reves, para que no sea casualidad del eje.
  const dobleH = [
    { tile: [3, 3], x: 10, y: 10, x2: 11, y2: 10, orientation: 'horizontal', side: 'first' }
  ];
  const elegidaH = straightestPlacement(dobleH, placementsFor(dobleH, [3, 6], 'right'), 'right');
  assert.equal(
    elegidaH.orientation,
    'vertical',
    'de un doble horizontal la cadena tiene que salir vertical'
  );
});

test('con timeoutRule skip-turn, quedarse sin tiempo solo PIERDE EL TURNO', () => {
  const s = createGame({
    gameFormat: 'domino-1v1-v1',
    seed: 'sin-tiempo',
    config: { timeoutRule: 'skip-turn' }
  });

  const seat = s.turn;
  const manoAntes = s.hands[seat].length;
  const puntosAntes = { ...s.scores };

  const r = applyAction(s, { type: ACTION.TIMEOUT, seat });
  assert.ok(r.ok, r.error);

  // Le toca al siguiente y nada mas: no se juega solo por el, no se cierra la
  // ronda y nadie suma puntos.
  assert.equal(r.state.phase, PHASE.PLAYING);
  assert.notEqual(r.state.turn, seat);
  assert.equal(r.state.board.length, 0);
  assert.equal(r.state.hands[seat].length, manoAntes);
  assert.deepEqual(r.state.scores, puntosAntes);
  assert.equal(r.events[0].kind, EVENT.TIMEOUT);
});

test('perder el turno por tiempo NO cuenta como pasar', () => {
  const s = createGame({
    gameFormat: 'domino-1v1-v1',
    seed: 'sin-tiempo-no-es-pase',
    config: { timeoutRule: 'skip-turn' }
  });

  const pasesAntes = s.passes;
  const r = applyAction(s, { type: ACTION.TIMEOUT, seat: s.turn });
  assert.ok(r.ok, r.error);

  // Pasar es declarar que no tenes jugada. Al que se le acaba el tiempo quizas
  // la tenia. Si contara como pase, dos descuidos seguidos cerrarian la ronda
  // como trancada y se puntuaria por fichas: justo el castigo que se saco.
  assert.equal(r.state.passes, pasesAntes);
  assert.equal(r.state.lastRound, null);
});

test('en 2v2 el turno pasa al siguiente asiento, que es un rival', () => {
  const s = createGame({
    gameFormat: 'domino-2v2-v1',
    seed: 'sin-tiempo-2v2',
    config: { timeoutRule: 'skip-turn' }
  });

  const seat = s.turn;
  const r = applyAction(s, { type: ACTION.TIMEOUT, seat });
  assert.ok(r.ok, r.error);

  assert.equal(r.state.turn, (seat + 1) % 4);
  assert.notEqual(r.state.teams[r.state.turn], r.state.teams[seat]);
  assert.equal(r.state.phase, PHASE.PLAYING);
});

test('sin configurar nada, el tiempo se sigue comportando como antes', () => {
  const s = createGame({ gameFormat: 'domino-1v1-v1', seed: 'tiempo-por-defecto' });
  assert.equal(s.config.timeoutRule, 'auto-play');

  const seat = s.turn;
  const r = applyAction(s, { type: ACTION.TIMEOUT, seat });
  assert.ok(r.ok, r.error);
  assert.equal(r.state.phase, PHASE.PLAYING);
});
