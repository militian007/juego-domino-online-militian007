// Como se juegan de verdad las tres modalidades (§128).
//
// No alcanza con que funcionen: hay que saber si una partida dura lo que tiene
// que durar. En el "Cinco" se anota jugando, asi que llegar a 100 es mucho mas
// rapido, y si no se ajusta el objetivo la partida se acaba en dos rondas.
import {
  createGame, applyAction, currentSeat, legalActions, isTerminal,
  resolveConfig, overridesDeModalidad, ACTION, EVENT, PHASE
} from '../src/index.js';

const PARTIDAS = Number(process.argv[2] || 300);

function jugar(modalidad, formato, objetivo) {
  const extra = overridesDeModalidad(modalidad);
  if (objetivo) extra.targetPoints = objetivo;

  let rondas = 0, trancadas = 0, dominos = 0, empates = 0;
  let puntosJugando = 0, puntosDeRonda = 0, turnos = 0, partidas = 0, rondasPorPartida = [];

  for (let p = 0; p < PARTIDAS; p++) {
    let st = createGame({ gameFormat: formato, seed: `${modalidad}-${p}` });
    st.config = resolveConfig(formato, extra);
    let g = 0, delaPartida = 0;
    while (!isTerminal(st) && g++ < 3000) {
      if (st.phase === PHASE.ROUND_OVER) {
        rondas++; delaPartida++;
        const r = st.lastRound;
        if (r.reason === 'domino') dominos++;
        else if (r.winnerTeam == null) empates++;
        else trancadas++;
        puntosDeRonda += r.points || 0;
        const sig = applyAction(st, { type: ACTION.START_NEXT_ROUND, seat: 0 });
        if (!sig.ok) break;
        st = sig.state;
        continue;
      }
      const seat = currentSeat(st);
      if (seat == null) break;
      turnos++;
      const acc = legalActions(st, seat);
      if (!acc.length) break;
      const r = applyAction(st, acc[0]);
      if (!r.ok) break;
      st = r.state;
    }
    puntosJugando += st.events.filter((e) => e.kind === EVENT.SCORE_FIVES)
      .reduce((a, e) => a + e.points, 0);
    if (delaPartida > 0) { partidas++; rondasPorPartida.push(delaPartida); }
  }

  const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return {
    rondas, turnosPorRonda: (turnos / rondas).toFixed(1),
    rondasPorPartida: media(rondasPorPartida).toFixed(1),
    trancadas: (trancadas / rondas * 100).toFixed(1) + '%',
    dominos: (dominos / rondas * 100).toFixed(1) + '%',
    empates: (empates / rondas * 100).toFixed(1) + '%',
    puntosJugando, puntosDeRonda
  };
}

const filas = [
  ['Con pozo  1v1', jugar('pozo', 'domino-1v1-v1')],
  ['Tranca    1v1', jugar('tranca', 'domino-1v1-v1')],
  ['Cinco     1v1 (a 100)', jugar('cinco', 'domino-1v1-v1')],
  ['Cinco     1v1 (a 200)', jugar('cinco', 'domino-1v1-v1', 200)],
  ['Cinco     1v1 (a 250)', jugar('cinco', 'domino-1v1-v1', 250)],
  ['Tranca    2v2', jugar('tranca', 'domino-2v2-v1')]
];

console.log('  modalidad                 rondas/partida  turnos/ronda  trancadas  dominos  empates');
for (const [n, r] of filas) {
  console.log(`  ${n.padEnd(24)} ${String(r.rondasPorPartida).padStart(10)}  ${String(r.turnosPorRonda).padStart(12)}  ${r.trancadas.padStart(9)}  ${r.dominos.padStart(7)}  ${r.empates.padStart(7)}`);
}
console.log('');
const c = filas[2][1];
console.log(`  En Cinco a 100: ${c.puntosJugando} puntos salieron de jugar y ${c.puntosDeRonda} de cerrar la ronda`);
console.log(`  (o sea, ${(c.puntosJugando / (c.puntosJugando + c.puntosDeRonda) * 100).toFixed(0)}% del marcador se gana durante la mano)`);
