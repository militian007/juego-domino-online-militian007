// Cuanto se tiene que alejar la camara del telefono para que la cadena entera
// quepa, jugada por jugada (§170).
//
// La ventana del telefono, a la escala mas cercana que permite la mesa, mide
// unas 9 celdas de ancho por 14 de alto. Cada jugada se mide la caja de la
// cadena contra esa ventana: `max(ancho/9, alto/14)`. 1 = cabe justo; 1,5 = la
// camara tuvo que alejarse una vez y media; el promedio dice que tan chicas se
// ven las fichas durante la partida.
//
//   node tools/medir-compacta.mjs [partidas]
import { createGame, applyAction, currentSeat, viewFor, PHASE, DEFAULT_LAYOUT } from '../src/index.js';
import { chooseAction } from '../src/bot.js';

const partidas = Number(process.argv[2] || 200);
const VENTANA = { ancho: 9, alto: 14 };

function caja(board) {
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  for (const t of board) {
    x1 = Math.min(x1, t.x, t.x2); x2 = Math.max(x2, t.x, t.x2);
    y1 = Math.min(y1, t.y, t.y2); y2 = Math.max(y2, t.y, t.y2);
  }
  return { ancho: x2 - x1 + 1, alto: y2 - y1 + 1 };
}

const res = {};
for (const formato of ['domino-1v1-v1', 'domino-2v2-v1']) {
  let turnos = 0, suma = 0, fuera = 0, sumaAncho = 0, sumaAlto = 0, peor = 0;
  for (let n = 0; n < partidas; n += 1) {
    let state = createGame({ gameFormat: formato, seed: `compacta-${n}` });
    for (let j = 0; j < 200 && state.phase === PHASE.PLAYING; j += 1) {
      const seat = currentSeat(state);
      const accion = chooseAction(viewFor(state, seat), { difficulty: 'normal', seed: `c-${n}-${j}` });
      if (!accion) break;
      const r = applyAction(state, { ...accion, seat });
      if (!r.ok) break;
      state = r.state;
      if (state.board.length < 2) continue;
      const c = caja(state.board);
      const puntaje = Math.max(c.ancho / VENTANA.ancho, c.alto / VENTANA.alto);
      turnos += 1; suma += puntaje; sumaAncho += c.ancho; sumaAlto += c.alto;
      if (puntaje > 1) fuera += 1;
      if (puntaje > peor) peor = puntaje;
    }
  }
  res[formato] = {
    turnos,
    alejamientoMedio: (suma / turnos).toFixed(3),
    turnosConCamaraAlejada: (100 * fuera / turnos).toFixed(1) + '%',
    cajaMedia: `${(sumaAncho / turnos).toFixed(1)} x ${(sumaAlto / turnos).toFixed(1)}`,
    peor: peor.toFixed(2)
  };
}
console.log(JSON.stringify(res, null, 1));
