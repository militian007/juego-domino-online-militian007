// Cuanto gana de verdad cada dificultad del bot contra las otras.
//
// Uso:
//   node tools/medir-fuerza.mjs              -> 300 partidas por cruce, a 50 puntos
//   node tools/medir-fuerza.mjs 1000         -> 1000 partidas por cruce
//   node tools/medir-fuerza.mjs 1000 100     -> a 100 puntos
//
// Cada cruce se juega en 1v1 (con pozo) y en 2v2 (sin pozo). Para que no pese
// quien sale ni en que asiento cae cada uno, la dificultad A ocupa el equipo 1
// en las partidas pares y el equipo 2 en las impares. El bot solo recibe
// `viewFor`, igual que en el servidor. Los alias: hard = maestro, easy = facil.
import {
  createGame, applyAction, currentSeat, legalActions, isTerminal, viewFor,
  chooseAction, ACTION, PHASE
} from '../src/index.js';

const PARTIDAS = Number(process.argv[2] || 300);
const OBJETIVO = Number(process.argv[3] || 50);

const CRUCES = [
  ['hard', 'easy'],
  ['hard', 'normal'],
  ['normal', 'easy'],
  ['easy', 'easy']
];

const FORMATOS = [
  ['1v1', 'domino-1v1-v1'],
  ['2v2', 'domino-2v2-v1']
];

function jugarUna(formato, dificultadDelEquipo, semilla) {
  let st = createGame({ gameFormat: formato, seed: semilla, config: { targetPoints: OBJETIVO } });
  let guardia = 0;

  while (!isTerminal(st) && guardia++ < 5000) {
    if (st.phase === PHASE.ROUND_OVER) {
      const sig = applyAction(st, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      if (!sig.ok) return null;
      st = sig.state;
      continue;
    }

    const seat = currentSeat(st);
    if (seat == null) return null;

    const view = viewFor(st, seat);
    const accion = chooseAction(view, { difficulty: dificultadDelEquipo[st.teams[seat]] })
      ?? legalActions(st, seat)[0];
    if (!accion) return null;

    const r = applyAction(st, accion);
    if (!r.ok) return null;
    st = r.state;
  }

  return st.result?.winnerTeam ?? null;
}

function medirCruce(formato, a, b) {
  let ganaA = 0, jugadas = 0;

  for (let p = 0; p < PARTIDAS; p++) {
    const equipoDeA = p % 2 === 0 ? 1 : 2;
    const dificultadDelEquipo = { [equipoDeA]: a, [equipoDeA === 1 ? 2 : 1]: b };
    const ganador = jugarUna(formato, dificultadDelEquipo, `fuerza-${formato}-${a}-${b}-${p}`);
    if (ganador == null) continue;
    jugadas++;
    if (ganador === equipoDeA) ganaA++;
  }

  const p = jugadas ? ganaA / jugadas : 0;
  const margen = jugadas ? 1.96 * Math.sqrt((p * (1 - p)) / jugadas) : 0;
  return { porcentaje: p * 100, margen: margen * 100, jugadas };
}

const arranque = Date.now();
const filas = [];
for (const [a, b] of CRUCES) {
  const fila = { cruce: `${a} vs ${b}` };
  for (const [nombre, formato] of FORMATOS) fila[nombre] = medirCruce(formato, a, b);
  filas.push(fila);
}
const segundos = ((Date.now() - arranque) / 1000).toFixed(1);

const celda = (r) => `${r.porcentaje.toFixed(1)}% (±${r.margen.toFixed(1)})`;

console.log('');
console.log(`  Victorias del primero, ${PARTIDAS} partidas por cruce y formato, a ${OBJETIVO} puntos`);
console.log('');
console.log(`  ${'cruce'.padEnd(18)} ${'1v1 con pozo'.padStart(16)}  ${'2v2 sin pozo'.padStart(16)}`);
for (const f of filas) {
  console.log(`  ${f.cruce.padEnd(18)} ${celda(f['1v1']).padStart(16)}  ${celda(f['2v2']).padStart(16)}`);
}
console.log('');
console.log(`  (entre parentesis, el margen del 95%; ${filas.length * FORMATOS.length * PARTIDAS} partidas en ${segundos}s)`);
console.log('');
