// ¿Cuantas veces el DIBUJO le veta una jugada legal a alguien, y cuantas de
// esas arregla el destranque?
//
//   node tools/medir-destranque.mjs [partidas]
//
// Separa los dos casos, que no son igual de graves:
//
//   veto PARCIAL - podia jugar otra ficha, pero una suya no entraba
//   veto TOTAL   - no podia jugar NADA teniendo ficha que pega con una punta
//
// El grave es el segundo: manda a robar o a pasar a quien tenia jugada.
import {
  createGame, applyAction, currentSeat, isTerminal, viewFor, playableMoves,
  ACTION, PHASE, DEFAULT_LAYOUT
} from '../src/index.js';
import { jugadasSinSitio, destrancarCadena } from '../src/layout.js';
import { chooseAction } from '../src/bot.js';

const partidas = Number(process.argv[2] || 150);
let turnos = 0;
let vetoParcial = 0;   // tiene otra jugada, pero una ficha suya no entra
let vetoTotal = 0;     // NO puede jugar nada, y tiene ficha que pega
let destrancadosTotal = 0, fallidosTotal = 0;
let rondas = 0, rondasConVetoTotal = new Set();

for (const formato of ['domino-1v1-v1', 'domino-2v2-v1']) {
  for (let p = 0; p < partidas; p++) {
    let state = createGame({ gameFormat: formato, seed: `casos-${formato}-${p}` });
    let guardias = 0;

    while (!isTerminal(state) && guardias++ < 500) {
      const seat = currentSeat(state);
      if (seat == null) break;

      if (state.phase === PHASE.PLAYING && state.board.length > 0) {
        turnos++;
        const atascadas = jugadasSinSitio(state.board, state.hands[seat], state.ends, DEFAULT_LAYOUT);
        if (atascadas.length > 0) {
          const puedeOtra = playableMoves(state, seat).length > 0;
          if (puedeOtra) vetoParcial++;
          else {
            vetoTotal++;
            rondasConVetoTotal.add(`${formato}-${p}-${state.round}`);
            const r = destrancarCadena(state.board, state.hands[seat], state.ends, DEFAULT_LAYOUT);
            if (r) destrancadosTotal++; else fallidosTotal++;
          }
        }
      }

      const accion = chooseAction(viewFor(state, seat), { difficulty: 'normal', seed: `c-${p}-${guardias}` });
      if (!accion) break;
      const r = applyAction(state, { ...accion, seat });
      if (!r.ok) break;
      state = r.state;
      if (state.phase === PHASE.ROUND_OVER) {
        rondas++;
        const sig = applyAction(state, { type: ACTION.START_NEXT_ROUND, seat });
        if (!sig.ok) break;
        state = sig.state;
      }
    }
  }
}

console.log('');
console.log(`  turnos mirados                     : ${turnos}`);
console.log(`  rondas jugadas                     : ${rondas}`);
console.log('');
console.log(`  veto PARCIAL (podia jugar otra)    : ${vetoParcial}  (${(100*vetoParcial/turnos).toFixed(3)}%)`);
console.log(`  veto TOTAL   (no podia jugar nada) : ${vetoTotal}  (${(100*vetoTotal/turnos).toFixed(3)}%)`);
console.log(`  rondas con al menos un veto TOTAL  : ${rondasConVetoTotal.size}  (${(100*rondasConVetoTotal.size/Math.max(1,rondas)).toFixed(2)}% de las rondas)`);
console.log('');
console.log(`  vetos TOTALES destrancados         : ${destrancadosTotal} de ${vetoTotal}`);
console.log(`  sin solucion                       : ${fallidosTotal}`);
console.log('');
