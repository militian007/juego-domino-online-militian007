// Las tres modalidades: Con pozo, Tranca y Cinco (§128).
import { test } from 'node:test';
import assert from 'node:assert';
import {
  createGame, applyAction, legalActions, currentSeat, playableMoves,
  sumaDeLasPuntas, resolveConfig, overridesDeModalidad, MODALIDADES,
  ACTION, EVENT, PHASE
} from '../src/index.js';

/** Arranca una partida y juega hasta que haya `n` fichas en la mesa. */
function jugarHasta(state, n) {
  let g = 0;
  while (state.board.length < n && g++ < 200) {
    const seat = currentSeat(state);
    if (seat == null) break;
    const acc = legalActions(state, seat);
    if (!acc.length) break;
    const r = applyAction(state, acc[0]);
    if (!r.ok) break;
    state = r.state;
  }
  return state;
}

// ---------------------------------------------------------------- config ---

test('las tres modalidades existen y traen su sobreescritura', () => {
  assert.deepEqual(Object.keys(MODALIDADES).sort(), ['cinco', 'pozo', 'tranca']);
  assert.equal(overridesDeModalidad('tranca').hasPool, false);
  assert.equal(overridesDeModalidad('cinco').scoring, 'cincos');
  assert.equal(overridesDeModalidad('pozo').scoring, 'clasico');
  assert.deepEqual(overridesDeModalidad('no-existe'), {});
});

test('Tranca en 1v1: se puede pedir sin pozo aunque sobren fichas', () => {
  const cfg = resolveConfig('domino-1v1-v1', overridesDeModalidad('tranca'));
  assert.equal(cfg.hasPool, false, 'pedido a proposito, se respeta');
});

test('pero un formato mal configurado sigue encendiendo el pozo solo', () => {
  // Sin pedirlo a proposito: 2 x 7 no son las 28 fichas, asi que hace falta pozo.
  const cfg = resolveConfig('domino-1v1-v1', { tilesPerPlayer: 5 });
  assert.equal(cfg.hasPool, true);
});

test('Cinco redondea los puntos de la ronda a multiplos de cinco', () => {
  const cfg = resolveConfig('domino-1v1-v1', overridesDeModalidad('cinco'));
  assert.equal(cfg.redondeoDeRonda, 5);
  assert.equal(resolveConfig('domino-1v1-v1', overridesDeModalidad('pozo')).redondeoDeRonda, 0);
});

// ------------------------------------------------------- suma de puntas ---

test('con una sola ficha en la mesa cuentan sus dos caras', () => {
  const st = { board: [{ tile: [3, 2] }], ends: { left: 3, right: 2 } };
  assert.equal(sumaDeLasPuntas(st), 5);
});

test('un doble en la punta cuenta DOBLE', () => {
  const st = {
    board: [{ tile: [5, 5] }, { tile: [5, 1] }, { tile: [1, 4] }],
    ends: { left: 5, right: 4 }
  };
  // El 5|5 esta cruzado con sus dos caras a la vista: son diez, no cinco.
  assert.equal(sumaDeLasPuntas(st), 10 + 4);
});

test('sin fichas en la mesa la suma es cero', () => {
  assert.equal(sumaDeLasPuntas({ board: [] }), 0);
  assert.equal(sumaDeLasPuntas({ board: null }), 0);
});

// ------------------------------------------------------- anotar jugando ---

test('en Cinco se anota cuando las puntas dan multiplo de cinco', () => {
  let st = createGame({ gameFormat: 'domino-1v1-v1', seed: 'cinco-1', ...{} });
  st.config = resolveConfig('domino-1v1-v1', overridesDeModalidad('cinco'));
  st = jugarHasta(st, 8);

  const anotaciones = st.events.filter((e) => e.kind === EVENT.SCORE_FIVES);
  assert.ok(anotaciones.length > 0, 'alguna jugada tuvo que dejar las puntas en multiplo de cinco');
  for (const a of anotaciones) {
    assert.equal(a.points % 5, 0, 'siempre se anota un multiplo de cinco');
    assert.ok(a.points > 0);
  }
  const suman = anotaciones.reduce((acc, a) => acc + a.points, 0);
  assert.ok(st.scores[1] + st.scores[2] >= suman, 'lo anotado esta en el marcador');
});

test('en clasico NUNCA se anota jugando', () => {
  let st = createGame({ gameFormat: 'domino-1v1-v1', seed: 'cinco-1' });
  st = jugarHasta(st, 12);
  assert.equal(st.events.filter((e) => e.kind === EVENT.SCORE_FIVES).length, 0);
  assert.equal(st.scores[1] + st.scores[2], 0, 'nadie suma hasta cerrar la ronda');
});

// ------------------------------------------------------------- Tranca ----

test('en Tranca no se puede robar, y el que no puede jugar PASA', () => {
  let st = createGame({ gameFormat: 'domino-1v1-v1', seed: 'tranca-1' });
  st.config = resolveConfig('domino-1v1-v1', overridesDeModalidad('tranca'));
  st.pool = [];

  const r = applyAction(st, { type: ACTION.DRAW, seat: currentSeat(st) });
  assert.equal(r.ok, false, 'robar no es una accion valida sin pozo');

  let g = 0;
  let hubopase = false;
  while (st.phase === PHASE.PLAYING && g++ < 200) {
    const seat = currentSeat(st);
    if (seat == null) break;
    const acc = legalActions(st, seat);
    assert.ok(!acc.some((a) => a.type === ACTION.DRAW), 'nunca se ofrece robar');
    if (playableMoves(st, seat).length === 0) {
      assert.ok(acc.some((a) => a.type === ACTION.PASS), 'si no podes jugar, podes pasar');
      hubopase = true;
    }
    const res = applyAction(st, acc[0]);
    if (!res.ok) break;
    st = res.state;
  }
  assert.ok(g > 1, 'la ronda avanzo');
  assert.ok(hubopase || st.phase !== PHASE.PLAYING, 'o alguien paso, o la ronda cerro');
});
