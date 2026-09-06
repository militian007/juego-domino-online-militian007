import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame, applyAction, currentSeat, isTerminal, viewFor,
  ACTION, EVENT, PHASE, DEFAULT_LAYOUT, necesitaDestrancar, playableMoves
} from '../src/index.js';
import { jugadasSinSitio, destrancarCadena, reconstruirCadena } from '../src/layout.js';
import { chooseAction } from '../src/bot.js';

/**
 * Una posicion real donde el jugador NO PUEDE JUGAR NADA y sin embargo tiene una
 * ficha que pega con una punta. Es el caso grave: el dibujo lo manda a robar o a
 * pasar cuando la regla del domino dice que tenia jugada.
 *
 * Sale de barrer partidas de bots con semilla fija: con `veto-118`, a las 39
 * jugadas, el asiento 0 tiene el 1|4, pega con la punta izquierda, no hay donde
 * ponerlo, el pozo esta vacio y no tiene ninguna otra jugada.
 *
 * Se reconstruye jugando, no guardando un estado a mano: un estado pegado en el
 * test se queda viejo en cuanto cambia cualquier regla y deja de probar nada.
 */
function posicionTrancada() {
  let state = createGame({ gameFormat: 'domino-1v1-v1', seed: 'veto-118' });

  for (let jugadas = 0; jugadas < 39; jugadas++) {
    const seat = currentSeat(state);
    const accion = chooseAction(viewFor(state, seat), {
      difficulty: 'normal',
      seed: `v-118-${jugadas}`
    });
    const r = applyAction(state, { ...accion, seat });
    assert.ok(r.ok, `la jugada ${jugadas} deberia entrar`);
    state = r.state;
  }

  return state;
}

test('la posicion de prueba: tiene ficha que pega y NO puede jugar nada', () => {
  const state = posicionTrancada();
  const seat = currentSeat(state);

  const atascadas = jugadasSinSitio(state.board, state.hands[seat], state.ends, DEFAULT_LAYOUT);
  assert.equal(atascadas.length, 1);
  assert.deepEqual(atascadas[0].tile, [1, 4]);

  // Esto es lo injusto: la regla dice que tiene jugada y el dibujo dice que no.
  assert.equal(playableMoves(state, seat).length, 0);
});

test('necesitaDestrancar la detecta', () => {
  const state = posicionTrancada();
  assert.equal(necesitaDestrancar(state, currentSeat(state)), true);
});

test('necesitaDestrancar es false cuando el jugador SI puede jugar', () => {
  let state = createGame({ gameFormat: 'domino-1v1-v1', seed: 'abierta-1' });
  const seat = currentSeat(state);
  const r = applyAction(state, { ...chooseAction(viewFor(state, seat), { seed: 'a' }), seat });
  state = r.state;

  const siguiente = currentSeat(state);
  assert.ok(playableMoves(state, siguiente).length > 0);
  assert.equal(necesitaDestrancar(state, siguiente), false);
});

test('RELAYOUT destranca: la ficha que no tenia sitio pasa a tenerlo', () => {
  const antes = posicionTrancada();
  const seat = currentSeat(antes);

  const r = applyAction(antes, { type: ACTION.RELAYOUT, seat });
  assert.ok(r.ok, r.error);

  const despues = r.state;
  assert.equal(jugadasSinSitio(despues.board, despues.hands[seat], despues.ends, DEFAULT_LAYOUT).length, 0);
  assert.ok(playableMoves(despues, seat).length > 0, 'ahora tiene que poder jugar');
});

test('RELAYOUT no toca la secuencia de fichas, ni las puntas, ni las manos, ni el turno', () => {
  const antes = posicionTrancada();
  const seat = currentSeat(antes);
  const despues = applyAction(antes, { type: ACTION.RELAYOUT, seat }).state;

  assert.deepEqual(
    despues.board.map((t) => t.tile),
    antes.board.map((t) => t.tile),
    'la cadena tiene que quedar en el mismo orden y con las mismas fichas'
  );
  assert.deepEqual(despues.ends, antes.ends, 'las puntas valen lo mismo');
  assert.deepEqual(despues.hands, antes.hands, 'nadie gana ni pierde fichas');
  assert.equal(despues.turn, antes.turn, 'sigue siendo el turno del mismo');
  assert.deepEqual(despues.scores, antes.scores);
  assert.equal(despues.pool.length, antes.pool.length);
});

test('RELAYOUT deja un evento con la forma que uso', () => {
  const antes = posicionTrancada();
  const r = applyAction(antes, { type: ACTION.RELAYOUT, seat: currentSeat(antes) });

  const evento = r.events.find((e) => e.kind === EVENT.RELAYOUT);
  assert.ok(evento, 'tiene que quedar registrado');
  assert.ok(typeof evento.forma === 'string' && evento.forma.length > 0);
  assert.equal(evento.tiles, antes.board.length);
});

test('el trazado nuevo es valido: dentro de la rejilla y sin fichas superpuestas', () => {
  const antes = posicionTrancada();
  const despues = applyAction(antes, { type: ACTION.RELAYOUT, seat: currentSeat(antes) }).state;

  const ocupadas = new Set();
  for (const t of despues.board) {
    for (const [x, y] of [[t.x, t.y], [t.x2, t.y2]]) {
      assert.ok(x >= 0 && x < DEFAULT_LAYOUT.grid, `columna ${x} fuera de la rejilla`);
      assert.ok(y >= 0 && y < DEFAULT_LAYOUT.grid, `fila ${y} fuera de la rejilla`);
      const clave = `${x},${y}`;
      assert.ok(!ocupadas.has(clave), `dos fichas en la casilla ${clave}`);
      ocupadas.add(clave);
    }
  }
});

test('el trazado nuevo respeta el enganche: cada ficha pega con la anterior', () => {
  const antes = posicionTrancada();
  const despues = applyAction(antes, { type: ACTION.RELAYOUT, seat: currentSeat(antes) }).state;

  for (let i = 1; i < despues.board.length; i++) {
    assert.equal(
      despues.board[i - 1].tile[1],
      despues.board[i].tile[0],
      `la ficha ${i} no pega con la ${i - 1}`
    );
  }
});

test('con destrancar apagado en config, la accion se rechaza', () => {
  const antes = posicionTrancada();
  antes.config.destrancar = false;

  const r = applyAction(antes, { type: ACTION.RELAYOUT, seat: currentSeat(antes) });
  assert.equal(r.ok, false);
  assert.equal(necesitaDestrancar(antes, currentSeat(antes)), false);
});

test('RELAYOUT se rechaza cuando no hay nada trancado', () => {
  let state = createGame({ gameFormat: 'domino-1v1-v1', seed: 'abierta-2' });
  const seat = currentSeat(state);
  state = applyAction(state, { ...chooseAction(viewFor(state, seat), { seed: 'b' }), seat }).state;

  const r = applyAction(state, { type: ACTION.RELAYOUT, seat: currentSeat(state) });
  assert.equal(r.ok, false);
});

test('reconstruirCadena devuelve la misma secuencia', () => {
  const state = posicionTrancada();
  const secuencia = state.board.map((t) => t.tile);

  const nuevo = reconstruirCadena(secuencia, DEFAULT_LAYOUT, 'compacta');
  assert.ok(nuevo, 'la forma compacta tiene que poder trazar la cadena');
  assert.deepEqual(nuevo.map((t) => t.tile), secuencia);
});

test('destrancarCadena devuelve null si no habia nada trancado', () => {
  const state = posicionTrancada();
  // Una mano vacia no puede estar trancada por nada.
  assert.equal(destrancarCadena(state.board, [], state.ends, DEFAULT_LAYOUT), null);
});

test('el estado sigue siendo serializable despues de destrancar', () => {
  const antes = posicionTrancada();
  const despues = applyAction(antes, { type: ACTION.RELAYOUT, seat: currentSeat(antes) }).state;

  const ida = JSON.parse(JSON.stringify(despues));
  assert.deepEqual(ida, despues);
});

test('la partida sigue jugandose normal despues de un destranque', () => {
  const antes = posicionTrancada();
  const seat = currentSeat(antes);
  let state = applyAction(antes, { type: ACTION.RELAYOUT, seat }).state;

  let jugadas = 0;
  while (!isTerminal(state) && jugadas++ < 200) {
    const s = currentSeat(state);
    if (s == null) break;
    const accion = chooseAction(viewFor(state, s), { difficulty: 'normal', seed: `post-${jugadas}` });
    if (!accion) break;
    const r = applyAction(state, { ...accion, seat: s });
    assert.ok(r.ok, `la jugada ${jugadas} de despues deberia entrar: ${r.error}`);
    state = r.state;
    if (state.phase === PHASE.ROUND_OVER) {
      state = applyAction(state, { type: ACTION.START_NEXT_ROUND, seat: s }).state;
    }
  }

  assert.ok(jugadas > 1, 'tiene que haber seguido jugandose');
});
