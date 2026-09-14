// Cuantas veces la cadena se dibuja PEGADA a si misma (§174): dos fichas que no
// son vecinas en la cadena quedan a menos de una celda en el dibujo (con los
// corrimientos de los dobles), como las dos columnas que vio Raul.
//
//   node tools/medir-pegadas.mjs [partidas]
import { createGame, applyAction, currentSeat, viewFor, PHASE, DEFAULT_LAYOUT } from '../src/index.js';
import { DEFAULT_LAYOUT as LAYOUT_BASE } from '../src/layout.js';
const CFG_CAMINO = process.env.DOMINO_CAMINO ? { layout: { ...LAYOUT_BASE, camino: process.env.DOMINO_CAMINO } } : undefined;
import { computeBoardOffsets, rectOf } from '../src/layout.js';
import { chooseAction } from '../src/bot.js';

const partidas = Number(process.argv[2] || 200);
const cell = DEFAULT_LAYOUT.cell;

function pegadas(board) {
  const offsets = computeBoardOffsets(board, DEFAULT_LAYOUT);
  const rects = board.map((t, i) => rectOf(t, offsets[i], cell));
  let n = 0;
  for (let i = 0; i < board.length; i += 1) {
    for (let k = i + 2; k < board.length; k += 1) {
      const a = rects[i], b = rects[k];
      const dx = Math.max(b.left - (a.left + a.width), a.left - (b.left + b.width), 0);
      const dy = Math.max(b.top - (a.top + a.height), a.top - (b.top + b.height), 0);
      if (dx < cell - 1 && dy < cell - 1) n += 1;
    }
  }
  return n;
}

const res = {};
for (const formato of ['domino-1v1-v1', 'domino-2v2-v1']) {
  let turnos = 0, turnosPegados = 0, rondas = 0, rondasPegadas = 0;
  for (let n = 0; n < partidas; n += 1) {
    let state = createGame({ config: CFG_CAMINO,  gameFormat: formato, seed: `pegadas-${n}` });
    let rondaPegada = false;
    for (let j = 0; j < 200 && state.phase === PHASE.PLAYING; j += 1) {
      const seat = currentSeat(state);
      const accion = chooseAction(viewFor(state, seat), { difficulty: 'normal', seed: `p-${n}-${j}` });
      if (!accion) break;
      const r = applyAction(state, { ...accion, seat });
      if (!r.ok) break;
      state = r.state;
      if (state.board.length < 3) continue;
      turnos += 1;
      if (pegadas(state.board) > 0) { turnosPegados += 1; rondaPegada = true; }
    }
    rondas += 1;
    if (rondaPegada) rondasPegadas += 1;
  }
  res[formato] = {
    turnos,
    turnosConCadenaPegada: (100 * turnosPegados / turnos).toFixed(1) + '%',
    rondasConCadenaPegada: (100 * rondasPegadas / rondas).toFixed(1) + '%'
  };
}
console.log(JSON.stringify(res, null, 1));
