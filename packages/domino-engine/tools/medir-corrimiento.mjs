// Cuanto se corre el dibujo de la cadena por culpa de los dobles (§131).
//
// Un doble va cruzado, asi que al dibujarlo se corre media celda respecto de su
// vecina, y a la ficha que sigue le pasa lo mismo. Esos medios se SUMAN a lo
// largo de la cadena. El problema no es el corrimiento en si: es que la caja
// que ocupa el dibujo crece, y como la camara escala para que la caja entre en
// la pantalla, **cada celda de mas achica todas las fichas**.
//
// Se mide la caja en CELDAS, con los offsets puestos y sin ellos.
import {
  createGame, applyAction, currentSeat, legalActions, isTerminal, ACTION, PHASE, DEFAULT_LAYOUT
} from '../src/index.js';
import { computeBoardOffsets, rectOf } from '../src/layout.js';

const cell = DEFAULT_LAYOUT.cell;
const PARTIDAS = Number(process.argv[2] || 300);

const caja = (board, offs) => {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  board.forEach((t, i) => {
    const r = rectOf(t, offs ? offs[i] || { x: 0, y: 0 } : { x: 0, y: 0 }, cell);
    x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top);
    x2 = Math.max(x2, r.left + r.width); y2 = Math.max(y2, r.top + r.height);
  });
  return { ancho: (x2 - x1) / cell, alto: (y2 - y1) / cell };
};

const conOffs = [], sinOffs = [], extraX = [], extraY = [];
let pos = 0;

for (let p = 0; p < PARTIDAS; p++) {
  let st = createGame({ gameFormat: process.env.FORMATO || 'domino-1v1-v1', seed: `corr-${p}` });
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
    const r = applyAction(st, acc[0]);
    if (!r.ok) break;
    st = r.state;
    if (st.board.length < 2) continue;
    pos++;
    const offs = computeBoardOffsets(st.board, DEFAULT_LAYOUT);
    const a = caja(st.board, offs);
    const b = caja(st.board, null);
    conOffs.push(Math.max(a.ancho, a.alto));
    sinOffs.push(Math.max(b.ancho, b.alto));
    extraX.push(a.ancho - b.ancho);
    extraY.push(a.alto - b.alto);
  }
}

const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * q)]; };
const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;

console.log(`  posiciones miradas: ${pos}`);
console.log('');
console.log('  LADO MAS LARGO DE LA CAJA, en celdas');
console.log(`    sin corrimiento  p50 ${pct(sinOffs, .5).toFixed(1)}   p90 ${pct(sinOffs, .9).toFixed(1)}   p99 ${pct(sinOffs, .99).toFixed(1)}   max ${Math.max(...sinOffs).toFixed(1)}`);
console.log(`    con corrimiento  p50 ${pct(conOffs, .5).toFixed(1)}   p90 ${pct(conOffs, .9).toFixed(1)}   p99 ${pct(conOffs, .99).toFixed(1)}   max ${Math.max(...conOffs).toFixed(1)}`);
console.log('');
console.log(`  celdas de mas que mete el corrimiento:  ancho ${media(extraX).toFixed(2)} de media (max ${Math.max(...extraX).toFixed(1)})`);
console.log(`                                          alto  ${media(extraY).toFixed(2)} de media (max ${Math.max(...extraY).toFixed(1)})`);
console.log('');
const perdida = conOffs.map((c, i) => sinOffs[i] / c);
console.log(`  tamaño de ficha que se pierde: las fichas se ven al ${(media(perdida) * 100).toFixed(1)}% de lo que podrian`);
console.log(`  (en el 10% peor de las posiciones, al ${(pct(perdida, .1) * 100).toFixed(1)}%)`);
