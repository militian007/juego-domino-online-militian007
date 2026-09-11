// Cuando el doble queda en paralelo a su vecina, lo que decide si se ve bien o
// mal no es cuanto se solapan: es HACIA DONDE sobresale.
//
//   hacia AFUERA -> se lee como que la cadena giro y el doble la cruza. Bien.
//   hacia ATRAS  -> el doble se mete por debajo de las fichas ya puestas. Mal,
//                   y es lo que Jonathan senalo en sus capturas.
import {
  createGame, applyAction, currentSeat, legalActions, isTerminal,
  ACTION, PHASE, DEFAULT_LAYOUT
} from '../src/index.js';
import { computeBoardOffsets, rectOf } from '../src/layout.js';

const cell = DEFAULT_LAYOUT.cell;
let afuera = 0, atras = 0, dobles = 0;

for (let p = 0; p < 300; p++) {
  let st = createGame({ gameFormat: 'domino-1v1-v1', seed: `dob-${p}` });
  let g = 0;
  while (!isTerminal(st) && g++ < 400) {
    if (st.phase === PHASE.ROUND_OVER) {
      const r = applyAction(st, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      if (!r.ok) break; st = r.state; continue;
    }
    const seat = currentSeat(st);
    if (seat == null) break;
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
    // La vecina es la del lado por donde se jugo.
    const k = i === 0 ? 1 : i - 1;
    const v = b[k];
    if (!v || v.tile[0] === v.tile[1] || v.orientation !== b[i].orientation) continue;

    const offs = computeBoardOffsets(b, DEFAULT_LAYOUT);
    const rd = rectOf(b[i], offs[i] || { x: 0, y: 0 }, cell);
    const rv = rectOf(v, offs[k] || { x: 0, y: 0 }, cell);

    // El "afuera" de la vecina es su punta libre, la contraria a la ficha de mas alla.
    const mas = b[k === i - 1 ? k - 1 : k + 1];
    const eje = b[i].orientation === 'horizontal' ? 'x' : 'y';
    const cen = (rr) => (eje === 'x' ? rr.left + rr.width / 2 : rr.top + rr.height / 2);
    let haciaAfuera;
    if (mas) {
      const rm = rectOf(mas, offs[b.indexOf(mas)] || { x: 0, y: 0 }, cell);
      haciaAfuera = Math.sign(cen(rv) - cen(rm));
    } else {
      haciaAfuera = Math.sign(cen(rd) - cen(rv)) || 1;
    }
    const desvio = Math.sign(cen(rd) - cen(rv));
    if (desvio === haciaAfuera) afuera++; else atras++;
  }
}

console.log(`  dobles jugados            : ${dobles}`);
console.log(`  paralelos hacia AFUERA    : ${afuera}`);
console.log(`  paralelos hacia ATRAS     : ${atras}   <-- los que se ven mal`);
console.log(`  ATRAS sobre el total      : ${(atras / dobles * 100).toFixed(2)}% de los dobles`);
