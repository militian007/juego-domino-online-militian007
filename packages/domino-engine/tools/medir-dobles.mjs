// Los dobles: como se ven y si estorban. Hay que mirar las dos cosas a la vez.
//
//   APILADO — el doble queda pegado al costado de su vecina y tapandola casi
//     entera. Es lo que se ve mal (Jonathan lo reporto con capturas). Se mide
//     como el % del lado largo del doble que se solapa con el de la vecina:
//     100% = uno encima del otro; 50% = cruza la punta, que es lo correcto.
//   TRABADAS — tenes una ficha que pega con una punta y no te deja ponerla.
import {
  createGame, applyAction, currentSeat, legalActions, isTerminal,
  playableMoves, ACTION, PHASE, DEFAULT_LAYOUT
} from '../src/index.js';
import { jugadasSinSitio, computeBoardOffsets, rectOf } from '../src/layout.js';

const PARTIDAS = Number(process.argv[2] || 300);
const cell = DEFAULT_LAYOUT.cell;

let dobles = 0, paralelos = 0, apilados = 0, turnos = 0, trabadas = 0;
let solapes = [];

for (let p = 0; p < PARTIDAS; p++) {
  let st = createGame({ gameFormat: 'domino-1v1-v1', seed: `dob-${p}` });
  let g = 0;
  while (!isTerminal(st) && g++ < 400) {
    if (st.phase === PHASE.ROUND_OVER) {
      const r = applyAction(st, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      if (!r.ok) break; st = r.state; continue;
    }
    const seat = currentSeat(st);
    if (seat == null) break;
    turnos++;
    if (st.board.length > 0 && playableMoves(st, seat).length === 0) {
      if (jugadasSinSitio(st.board, st.hands[seat], st.ends, DEFAULT_LAYOUT).length > 0) trabadas++;
    }
    const acc = legalActions(st, seat);
    if (!acc.length) break;
    const a = acc[0];
    const r = applyAction(st, a);
    if (!r.ok) break;
    st = r.state;

    if (a.type !== ACTION.PLAY_TILE || !a.tile || a.tile[0] !== a.tile[1]) continue;
    dobles++;
    const b = st.board;
    const i = b.findIndex((t) => t.tile[0] === t.tile[1] && t.tile[0] === a.tile[0]);
    if (i < 0) continue;
    const offs = computeBoardOffsets(b, DEFAULT_LAYOUT);
    const rd = rectOf(b[i], offs[i] || { x: 0, y: 0 }, cell);
    for (const k of [i - 1, i + 1]) {
      const v = b[k];
      if (!v || v.tile[0] === v.tile[1]) continue;
      if (v.orientation !== b[i].orientation) continue;
      paralelos++;
      const rv = rectOf(v, offs[k] || { x: 0, y: 0 }, cell);
      const largo = b[i].orientation === 'horizontal'
        ? Math.min(rd.left + rd.width, rv.left + rv.width) - Math.max(rd.left, rv.left)
        : Math.min(rd.top + rd.height, rv.top + rv.height) - Math.max(rd.top, rv.top);
      const frac = Math.max(0, largo) / (cell * 2);
      solapes.push(frac);
      if (frac > 0.75) apilados++;
      break;
    }
  }
}

const media = solapes.length ? solapes.reduce((x, y) => x + y, 0) / solapes.length : 0;
console.log(`  partidas ${PARTIDAS} | turnos ${turnos} | dobles jugados ${dobles}`);
console.log(`  en paralelo con la vecina : ${paralelos}  (${(paralelos / dobles * 100).toFixed(2)}%)`);
console.log(`  de esos, APILADOS (>75%)  : ${apilados}  (${(apilados / dobles * 100).toFixed(2)}% de los dobles)`);
console.log(`  solape medio del paralelo : ${(media * 100).toFixed(1)}%   (50% = cruza la punta, 100% = encima)`);
console.log(`  fichas trabadas           : ${trabadas}  (${(trabadas / turnos * 100).toFixed(3)}% de los turnos)`);
