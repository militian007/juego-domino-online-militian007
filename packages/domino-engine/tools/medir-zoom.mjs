// Vuelve a medir el zoom de la mesa, pero bien.
//
// `medir-zoom.mjs` daba por buena una ventana CUADRADA: comparaba el ancho y el
// alto de la cadena contra el mismo numero de celdas. En el telefono eso es
// falso. La escala la manda el lado corto (el ancho), asi que a lo alto se ven
// muchas mas celdas de las que se ven a lo ancho, y una cadena alta entra sin
// problema aunque el tool dijera que no.
//
// Ademas la camara se corre: mientras la caja de la cadena QUEPA en la ventana,
// la camara la encuadra y no se sale nada. Lo unico que la camara no puede
// arreglar es que la cadena sea mas grande que la ventana.
//
// Asi que la pregunta correcta es: ¿en que porcentaje de posiciones la cadena
// no CABE, a lo ancho o a lo alto, en la ventana de verdad de cada pantalla?
//
//   node tools/medir-zoom.mjs [partidas]
//
// (La version vieja vivia en scratch/, que no se versiona, asi que la medicion
//  no se podia repetir en otra maquina. Esta si.)
import {
  createGame, applyAction, currentSeat, isTerminal, viewFor, ACTION, PHASE,
  computeBoardOffsets, DEFAULT_LAYOUT
} from '../src/index.js';
import { chooseAction } from '../src/bot.js';

const GRID = DEFAULT_LAYOUT.grid;
const CELL = DEFAULT_LAYOUT.cell;
const MARGEN_CELDAS = 2;
const LADO_CELDAS = GRID + 2 * MARGEN_CELDAS;

const partidas = Number(process.argv[2] || 150);

/**
 * Los rectangulos de juego de verdad, en pixeles.
 *
 * El del telefono sale de medir la aplicacion corriendo a 375 de ancho; el de
 * escritorio, de una ventana normal. Son los que recibe `Board` como
 * `anchoUtil` x `altoUtil`, ya descontados los margenes de los asientos y la
 * mano.
 */
const PANTALLAS = [
  { nombre: 'telefono 375', ancho: 315, alto: 454 },
  { nombre: 'telefono ancho', ancho: 359, alto: 560 },
  { nombre: 'escritorio', ancho: 700, alto: 620 }
];

const cajas = [];

for (const formato of ['domino-1v1-v1', 'domino-2v2-v1']) {
  for (let p = 0; p < partidas; p++) {
    let state = createGame({ gameFormat: formato, seed: `zoomcam-${formato}-${p}` });
    let guardias = 0;

    while (!isTerminal(state) && guardias++ < 500) {
      const seat = currentSeat(state);
      if (seat == null) break;

      const accion = chooseAction(viewFor(state, seat), {
        difficulty: 'normal',
        seed: `zc-${p}-${guardias}`
      });
      if (!accion) break;

      const r = applyAction(state, { ...accion, seat });
      if (!r.ok) break;
      state = r.state;

      if (state.phase !== PHASE.PLAYING) {
        if (state.phase === PHASE.ROUND_OVER) {
          const sig = applyAction(state, { type: ACTION.START_NEXT_ROUND, seat });
          if (!sig.ok) break;
          state = sig.state;
        }
        continue;
      }

      const board = state.board;
      if (!board || board.length === 0) continue;

      const offsets = computeBoardOffsets(board);
      let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;

      const caja = (i) => {
        const pos = board[i];
        const o = offsets[i] || { x: 0, y: 0 };
        const ancho = pos.orientation === 'horizontal' ? 2 : 1;
        const alto = pos.orientation === 'horizontal' ? 1 : 2;
        const l = Math.min(pos.x, pos.x2) + o.x / CELL;
        const t = Math.min(pos.y, pos.y2) + o.y / CELL;
        return { x1: l, x2: l + ancho, y1: t, y2: t + alto };
      };

      board.forEach((_, i) => {
        const c = caja(i);
        x1 = Math.min(x1, c.x1); x2 = Math.max(x2, c.x2);
        y1 = Math.min(y1, c.y1); y2 = Math.max(y2, c.y2);
      });

      // Las dos puntas jugables: es lo unico que la camara garantiza cuando la
      // cadena entera ya no entra.
      const a = caja(0);
      const b = caja(board.length - 1);

      cajas.push({
        w: x2 - x1,
        h: y2 - y1,
        pw: Math.max(a.x2, b.x2) - Math.min(a.x1, b.x1),
        ph: Math.max(a.y2, b.y2) - Math.min(a.y1, b.y1),
        formato
      });
    }
  }
}

console.log('');
console.log(`  ${cajas.length} posiciones de partidas jugadas de verdad (1v1 y 2v2)`);
console.log(`  Cadena mas grande: ${Math.max(...cajas.map((c) => c.w)).toFixed(1)} de ancho, ` +
  `${Math.max(...cajas.map((c) => c.h)).toFixed(1)} de alto`);

for (const p of PANTALLAS) {
  console.log('');
  console.log(`  ${p.nombre} — rectangulo de juego ${p.ancho}x${p.alto}`);
  console.log('   zoom | a lo ancho | a lo alto | cadena entera fuera | PUNTAS fuera | ficha');
  console.log('  ------|------------|-----------|---------------------|--------------|-------');

  for (const zoom of [1.10, 1.20, 1.30, 1.40, 1.50, 1.60, 1.75]) {
    const escala = (Math.min(p.ancho, p.alto) / (LADO_CELDAS * CELL)) * zoom;
    const visiblesX = p.ancho / (CELL * escala);
    const visiblesY = p.alto / (CELL * escala);

    const fuera = cajas.filter((c) => c.w > visiblesX + 0.001 || c.h > visiblesY + 0.001).length;
    // Lo que de verdad duele: que no entren ni las dos puntas jugables.
    const puntasFuera = cajas.filter((c) => c.pw > visiblesX + 0.001 || c.ph > visiblesY + 0.001).length;
    const celdaPx = CELL * escala;

    console.log(
      `  ${zoom.toFixed(2)} | ${visiblesX.toFixed(1).padStart(10)} | ` +
      `${visiblesY.toFixed(1).padStart(9)} | ` +
      `${(((fuera / cajas.length) * 100).toFixed(3) + '%').padStart(19)} | ` +
      `${(((puntasFuera / cajas.length) * 100).toFixed(3) + '%').padStart(12)} | ` +
      `${Math.round(celdaPx * 2)}x${Math.round(celdaPx)}`
    );
  }
}

console.log('');
