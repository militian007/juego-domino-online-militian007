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
  roundSeed,
  playableMoves
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

import { placementsFor, boardEnds, computeBoardOffsets } from '../src/layout.js';

const L = { grid: 20, cell: 32 };

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

test('serpentina: cada extremo ofrece exactamente un lugar', () => {
  const board = [
    { tile: [2, 5], side: 'first', x: 9, y: 9, x2: 10, y2: 9, orientation: 'horizontal' }
  ];
  assert.equal(placementsFor(board, [5, 3], 'right', L).length, 1);
  assert.equal(placementsFor(board, [4, 2], 'left', L).length, 1);
  assert.equal(placementsFor(board, [6, 6], 'right', L).length, 0, 'si no pega, no hay lugar');
});

test('serpentina: el doble se cruza y sale de la fila', () => {
  const board = [
    { tile: [2, 5], side: 'first', x: 9, y: 9, x2: 10, y2: 9, orientation: 'horizontal' }
  ];
  const [p] = placementsFor(board, [5, 5], 'right', L);
  assert.equal(p.orientation, 'vertical', 'el doble va cruzado');
  assert.equal(p.x, p.x2, 'ocupa una sola columna');
  assert.equal(Math.min(p.y, p.y2), 9, 'arranca en la fila de la cadena');
  const [off] = computeBoardOffsets([p], L);
  assert.equal(off.y, -L.cell / 2, 'se sube media celda para quedar centrado en la fila');
});

test('serpentina: al llegar al borde baja de fila y sigue al reves', () => {
  let board = [
    { tile: [0, 1], side: 'first', x: 9, y: 9, x2: 10, y2: 9, orientation: 'horizontal' }
  ];
  let val = 1;
  for (let i = 0; i < 8; i++) {
    const siguiente = (val + 1) % 7;
    const [p] = placementsFor(board, [val, siguiente], 'right', L);
    assert.ok(p, 'siempre tiene que haber lugar');
    board = [...board, p];
    val = siguiente;
  }
  const filas = [...new Set(board.map((t) => Math.min(t.y, t.y2)))];
  assert.ok(filas.length > 1, 'la cadena tuvo que cambiar de fila');
  assert.ok(Math.max(...board.map((t) => Math.max(t.x, t.x2))) <= L.grid - 1, 'nada se sale');
  assert.ok(Math.max(...filas) > 9, 'la mitad derecha baja');
});

test('serpentina: las fichas ya puestas nunca se mueven', () => {
  let board = [
    { tile: [3, 4], side: 'first', x: 9, y: 9, x2: 10, y2: 9, orientation: 'horizontal' }
  ];
  const [d1] = placementsFor(board, [4, 5], 'right', L);
  board = [...board, d1];
  const antes = JSON.stringify(board);
  const [i1] = placementsFor(board, [2, 3], 'left', L);
  board = [i1, ...board];
  assert.equal(JSON.stringify(board.slice(1)), antes, 'jugar por la izquierda no corre lo demas');
  const [d2] = placementsFor(board, [5, 6], 'right', L);
  assert.deepEqual(
    { x: d2.x, y: d2.y },
    { x: 13, y: 9 },
    'la derecha sigue donde iba, sin importar lo que paso por la izquierda'
  );
});

test('serpentina: en una partida entera la cadena nunca se pisa', () => {
  let choques = 0;
  let fichas = 0;
  for (let g = 0; g < 40; g++) {
    let st = createGame({
      gameFormat: 'domino-2v2-v1',
      seed: 'serp-' + g,
      players: [0, 1, 2, 3].map((i) => ({ id: 'p' + i }))
    });
    let pasos = 0;
    while (st.phase !== PHASE.GAME_OVER && pasos++ < 1200) {
      if (st.phase === PHASE.ROUND_OVER) {
        const n = applyAction(st, { type: ACTION.START_NEXT_ROUND, seat: 0 });
        if (!n.ok) break;
        st = n.state;
        continue;
      }
      const a = chooseAction(viewFor(st, st.turn), { seed: 's' + g + '-' + pasos });
      const r = applyAction(st, { ...a, seat: st.turn });
      if (!r.ok) break;
      st = r.state;

      const usadas = new Set();
      for (const t of st.board) {
        fichas++;
        for (const c of [t.x + ',' + t.y, t.x2 + ',' + t.y2]) {
          if (usadas.has(c)) choques++;
          usadas.add(c);
        }
      }
    }
  }
  assert.ok(fichas > 5000, 'la muestra tiene que ser grande');
  assert.equal(choques, 0, 'ninguna celda puede estar ocupada dos veces');
});

test('serpentina: si la ficha pega con un extremo, SIEMPRE hay donde ponerla', () => {
  let trancadoTeniendola = 0;
  let turnosSinJugar = 0;
  for (let g = 0; g < 40; g++) {
    let st = createGame({
      gameFormat: 'domino-2v2-v1',
      seed: 'garantia-' + g,
      players: [0, 1, 2, 3].map((i) => ({ id: 'p' + i }))
    });
    let pasos = 0;
    while (st.phase !== PHASE.GAME_OVER && pasos++ < 1200) {
      if (st.phase === PHASE.ROUND_OVER) {
        const n = applyAction(st, { type: ACTION.START_NEXT_ROUND, seat: 0 });
        if (!n.ok) break;
        st = n.state;
        continue;
      }
      const asiento = st.turn;
      if (playableMoves(st, asiento).length === 0 && st.board.length > 0) {
        turnosSinJugar++;
        const e = st.ends;
        if (st.hands[asiento].some(
          (t) => t[0] === e.left || t[1] === e.left || t[0] === e.right || t[1] === e.right
        )) trancadoTeniendola++;
      }
      const a = chooseAction(viewFor(st, asiento), { seed: 'g' + g + '-' + pasos });
      const r = applyAction(st, { ...a, seat: asiento });
      if (!r.ok) break;
      st = r.state;
    }
  }
  assert.ok(turnosSinJugar > 200, 'tiene que haber pasado seguido');
  assert.equal(
    trancadoTeniendola,
    0,
    'nadie puede quedarse trancado teniendo una ficha que pega con un extremo'
  );
});
