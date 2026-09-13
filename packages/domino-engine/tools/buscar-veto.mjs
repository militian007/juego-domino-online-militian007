// Busca una posicion de prueba para el destranque: un jugador con una ficha
// que pega con una punta y sin ningun sitio donde ponerla (veto TOTAL), con el
// pozo vacio. La usa test/destrancar.test.js, que la reconstruye jugando con
// semilla fija en vez de pegar un estado a mano.
//
//   node tools/buscar-veto.mjs            -> barre las semillas veto-1 a veto-400
//   node tools/buscar-veto.mjs 2000       -> hasta veto-2000
import { createGame, applyAction, currentSeat, viewFor, playableMoves, DEFAULT_LAYOUT } from '../src/index.js';
import { jugadasSinSitio } from '../src/layout.js';
import { chooseAction } from '../src/bot.js';

const hasta = Number(process.argv[2] || 400);
let encontradas = 0;
for (let n = 1; n <= hasta && encontradas < 5; n += 1) {
  const semilla = `veto-${n}`;
  let state = createGame({ gameFormat: 'domino-1v1-v1', seed: semilla });
  for (let jugadas = 0; jugadas < 60; jugadas += 1) {
    const seat = currentSeat(state);
    if (state.phase !== 'playing') break;
    const atascadas = jugadasSinSitio(state.board, state.hands[seat], state.ends, DEFAULT_LAYOUT);
    if (atascadas.length === 1 && playableMoves(state, seat).length === 0 && state.pool.length === 0) {
      console.log(JSON.stringify({ semilla, jugadas, asiento: seat, ficha: atascadas[0].tile, fichasEnMesa: state.board.length }));
      encontradas += 1;
      break;
    }
    const accion = chooseAction(viewFor(state, seat), { difficulty: 'normal', seed: `${semilla}-${jugadas}` });
    const r = applyAction(state, { ...accion, seat });
    if (!r.ok) break;
    state = r.state;
  }
}
if (!encontradas) console.log('ninguna en', hasta, 'semillas');
