import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame,
  applyAction,
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

import { placementsFor, boardEnds } from '../src/layout.js';

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

test('sin regresion: un doble en el medio sigue teniendo una sola colocacion', () => {
  const board = [
    { tile: [4, 5], side: 'first', x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal' },
    { tile: [5, 5], side: 'right', x: 10, y: 10, x2: 10, y2: 11, orientation: 'vertical' }
  ];
  const ops = placementsFor(board, [5, 2], 'right', L);
  assert.equal(ops.length, 1, 'en el medio la regla perpendicular no cambia');
  assert.equal(ops[0].orientation, 'horizontal');
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

test('amontonamiento: ninguna partida deja fichas tocandose fuera de la cadena', () => {
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

      const owner = new Map();
      s.board.forEach((t, i) => {
        owner.set(`${t.x},${t.y}`, i);
        owner.set(`${t.x2},${t.y2}`, i);
      });
      s.board.forEach((t, i) => {
        for (const [cx, cy] of [[t.x, t.y], [t.x2, t.y2]]) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const o = owner.get(`${cx + dx},${cy + dy}`);
            if (o === undefined || o === i) continue;
            assert.equal(Math.abs(o - i), 1, `las fichas ${i} y ${o} se tocan sin ser vecinas de cadena`);
          }
        }
      });
    }
  }
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

test('doble: puede cruzarse hacia cualquiera de los dos lados de la cadena', () => {
  const board = [
    { tile: [2, 4], side: 'first', x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal' }
  ];
  const ops = placementsFor(board, [4, 4], 'right', L);
  assert.equal(ops.length, 2, 'un doble tiene dos posiciones cruzadas');
  assert.ok(ops.every((p) => p.orientation === 'vertical'));
  assert.ok(ops.every((p) => p.x === 10 && p.x2 === 10), 'ambas en la columna siguiente');
  assert.ok(ops.some((p) => Math.min(p.y, p.y2) === 9), 'falta la que sobresale hacia arriba');
  assert.ok(ops.some((p) => Math.min(p.y, p.y2) === 10), 'falta la que sobresale hacia abajo');
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
  assert.equal(ops.length, 1, 'la de arriba toca la vuelta, la de abajo entra');
  assert.equal(Math.min(ops[0].y, ops[0].y2), 10, 'debe ser la que sobresale hacia abajo');
  assert.equal(boardEnds([...board, ops[0]]).right, 6);
});

test('doble en el medio: sigue siendo perpendicular, nunca en linea', () => {
  const board = [
    { tile: [2, 4], side: 'first', x: 8, y: 10, x2: 9, y2: 10, orientation: 'horizontal' }
  ];
  for (const p of placementsFor(board, [4, 4], 'right', L)) {
    assert.notEqual(p.orientation, board[0].orientation, 'un doble jamas va en linea');
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
