import fs from 'node:fs';
import path from 'node:path';
import { computeBoardOffsets, rectOf, DEFAULT_LAYOUT } from '@privoytruco/domino-engine/layout';

/**
 * EL VIGILANTE DE LAS FICHAS MONTADAS (seccion 169).
 *
 * Raul vio en su mesa una ficha montada encima de otra y no se pudo reproducir:
 * 30.000 turnos de bots, 388 cadenas por las cuatro formas del destranque y
 * cinco rondas en el navegador, cero montadas. En vez de adivinar, el servidor
 * revisa el dibujo despues de cada jugada y de cada destranque, y si dos fichas
 * se solapan mas de un cuarto guarda la mesa entera en `backend/montadas.log`
 * (ignorado por git). Con esa mesa se reproduce el caso exacto.
 *
 * Nunca toca el juego: solo mira y anota, y todo va envuelto.
 */
const ARCHIVO = path.resolve(process.cwd(), 'montadas.log');

function solape(a, b) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.min(a.width * a.height, b.width * b.height);
}

export function buscarMontada(board) {
  if (!board || board.length < 2) return null;
  const offsets = computeBoardOffsets(board, DEFAULT_LAYOUT);
  const rects = board.map((t, i) => rectOf(t, offsets[i] || { x: 0, y: 0 }, DEFAULT_LAYOUT.cell));
  for (let i = 0; i < board.length; i += 1) {
    for (let k = i + 1; k < board.length; k += 1) {
      const s = solape(rects[i], rects[k]);
      if (s > 0.25) return { i, k, solape: Math.round(s * 100) };
    }
  }
  return null;
}

export function vigilarMontadas(board, contexto = {}) {
  try {
    const m = buscarMontada(board);
    if (!m) return null;
    const linea = JSON.stringify({ cuando: new Date().toISOString(), ...contexto, montada: m, board });
    fs.appendFileSync(ARCHIVO, linea + '\n');
    console.warn(`[montadas] fichas ${m.i} y ${m.k} se solapan ${m.solape}% — anotado en montadas.log`);
    return m;
  } catch {
    return null;
  }
}
