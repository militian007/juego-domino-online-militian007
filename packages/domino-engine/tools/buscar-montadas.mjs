// Busca fichas MONTADAS: dos fichas de la mesa cuyo dibujo (con los
// corrimientos de los dobles) se solapa mas de un cuarto de ficha.
//
// Juega partidas ENTERAS de bots con la regla vigente, con el destranque que
// aplica el servidor antes de cada jugada, y despues de cada jugada (y de cada
// destranque) compara TODAS las parejas de fichas de la mesa.
//
//   node tools/buscar-montadas.mjs            -> 300 partidas por formato
//   node tools/buscar-montadas.mjs 1000
import { createGame, applyAction, currentSeat, viewFor, necesitaDestrancar, ACTION, PHASE, DEFAULT_LAYOUT } from '../src/index.js';
import { DEFAULT_LAYOUT as LAYOUT_BASE } from '../src/layout.js';
const CFG_CAMINO = process.env.DOMINO_CAMINO ? { layout: { ...LAYOUT_BASE, camino: process.env.DOMINO_CAMINO } } : undefined;
import { computeBoardOffsets, rectOf } from '../src/layout.js';
import { chooseAction } from '../src/bot.js';

const partidas = Number(process.argv[2] || 300);
const cell = DEFAULT_LAYOUT.cell;
let turnos = 0, montadas = 0, montadasTrasRelayout = 0, relayouts = 0, doblesEnLinea = 0, dobles = 0;
const ejemplos = [];

function solape(a, b) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.min(a.width * a.height, b.width * b.height);
}

function revisar(board, etiqueta) {
  const offsets = computeBoardOffsets(board);
  const rects = board.map((t, i) => rectOf(t, offsets[i], cell));
  for (let i = 0; i < board.length; i += 1) {
    for (let k = i + 1; k < board.length; k += 1) {
      const s = solape(rects[i], rects[k]);
      if (s > 0.25) return { i, k, solape: Math.round(s * 100) + '%', etiqueta };
    }
  }
  return null;
}

for (let n = 0; n < partidas; n += 1) {
  for (const formato of ['domino-1v1-v1', 'domino-2v2-v1']) {
    let state = createGame({ config: CFG_CAMINO,  gameFormat: formato, seed: `montadas-${n}` });
    let ultimo = null;
    for (let j = 0; j < 2000 && state.phase !== PHASE.GAME_OVER; j += 1) {
      const seat = currentSeat(state);
      if (state.phase === PHASE.PLAYING && necesitaDestrancar(state, seat)) {
        const r = applyAction(state, { type: ACTION.RELAYOUT, seat });
        if (r.ok) {
          state = r.state; relayouts += 1;
          const m = revisar(state.board, 'tras relayout');
          if (m && ultimo !== `${n}-${formato}-r`) { montadasTrasRelayout += 1; ultimo = `${n}-${formato}-r`; if (ejemplos.length < 6) ejemplos.push({ formato, seed: `montadas-${n}`, jugada: j, ...m, a: state.board[m.i], b: state.board[m.k] }); }
        }
      }
      const accion = chooseAction(viewFor(state, seat), { difficulty: 'normal', seed: `m-${n}-${j}` });
      if (!accion) break;
      const r = applyAction(state, { ...accion, seat });
      if (!r.ok) break;
      state = r.state;
      turnos += 1;
      if (accion.type !== ACTION.PLAY_TILE) continue;
      const board = state.board;
      const nueva = accion.side === 'left' ? 0 : board.length - 1;
      const t = board[nueva];
      if (t && t.tile[0] === t.tile[1] && board.length > 1) {
        dobles += 1;
        const vecina = board[nueva === 0 ? 1 : nueva - 1];
        if (vecina.orientation === t.orientation) doblesEnLinea += 1;
      }
      const m = revisar(board, 'tras jugada');
      if (m) { montadas += 1; if (ejemplos.length < 6) ejemplos.push({ formato, seed: `montadas-${n}`, jugada: j, ...m, a: board[m.i], b: board[m.k], nueva: t }); }
    }
  }
}
console.log(JSON.stringify({ partidas, turnos, relayouts, dobles, doblesEnLinea, pctDoblesEnLinea: (100 * doblesEnLinea / Math.max(1, dobles)).toFixed(2) + '%', montadasTrasJugada: montadas, montadasTrasRelayout, ejemplos }, null, 1));
