// Prueba las cuatro formas del destranque (`reconstruirCadena`) sobre miles de
// cadenas reales y mide si alguna deja fichas montadas en el dibujo.
//
//   node tools/buscar-montadas-relayout.mjs [partidas]
import { createGame, applyAction, currentSeat, viewFor, PHASE, DEFAULT_LAYOUT } from '../src/index.js';
import { computeBoardOffsets, rectOf, reconstruirCadena, FORMAS_DE_CADENA } from '../src/layout.js';
import { chooseAction } from '../src/bot.js';

const partidas = Number(process.argv[2] || 100);
const cell = DEFAULT_LAYOUT.cell;
const cuenta = Object.fromEntries(FORMAS_DE_CADENA.map((f) => [f, { cadenas: 0, montadas: 0, sinSitio: 0 }]));
let ejemplos = [];

function solape(a, b) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.min(a.width * a.height, b.width * b.height);
}
function montada(board) {
  const offsets = computeBoardOffsets(board);
  const rects = board.map((t, i) => rectOf(t, offsets[i], cell));
  for (let i = 0; i < board.length; i += 1) for (let k = i + 1; k < board.length; k += 1) {
    const s = solape(rects[i], rects[k]); if (s > 0.25) return { i, k, solape: Math.round(s * 100) + '%' };
  }
  return null;
}

for (let n = 0; n < partidas; n += 1) {
  let state = createGame({ gameFormat: 'domino-1v1-v1', seed: `relayout-${n}` });
  for (let j = 0; j < 60 && state.phase === PHASE.PLAYING; j += 1) {
    const seat = currentSeat(state);
    const accion = chooseAction(viewFor(state, seat), { difficulty: 'normal', seed: `r-${n}-${j}` });
    if (!accion) break;
    const r = applyAction(state, { ...accion, seat }); if (!r.ok) break; state = r.state;
    if (state.board.length < 6 || j % 3 !== 0) continue;
    const secuencia = state.board.map((t) => ({ tile: t.tile, side: t.side }));
    for (const forma of FORMAS_DE_CADENA) {
      let nueva;
      try { nueva = reconstruirCadena(secuencia, DEFAULT_LAYOUT, forma); } catch (e) { nueva = null; }
      if (!nueva) { cuenta[forma].sinSitio += 1; continue; }
      cuenta[forma].cadenas += 1;
      const m = montada(nueva);
      if (m) { cuenta[forma].montadas += 1; if (ejemplos.length < 5) ejemplos.push({ forma, seed: `relayout-${n}`, jugada: j, ...m, a: nueva[m.i], b: nueva[m.k] }); }
    }
  }
}
console.log(JSON.stringify({ partidas, cuenta, ejemplos }, null, 1));
