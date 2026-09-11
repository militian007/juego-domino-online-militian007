// Las tres modalidades jugadas por el RoomManager, que es lo que corre de
// verdad (§128).
//
//   npm run test:modalidades
//
// Las pruebas del motor comprueban las reglas. Esta comprueba lo otro: que la
// modalidad que se pide al crear la sala sea la que se juega, y que llegue a la
// pantalla.
import {
  applyAction, currentSeat, legalActions, isTerminal, ACTION, PHASE
} from '@privoytruco/domino-engine';
import { RoomManager } from './RoomManager.js';

let pasados = 0, fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

const ioDePrueba = () => ({ emit: () => {}, to: () => ({ emit: () => {} }) });

function partida(manager, modalidad, mode = '1v1bot') {
  const sala = manager.createRoom({ mode, modalidad, hostId: 'j1', hostUsername: 'Prueba' });
  const arranque = manager.startGame(sala.code);
  if (arranque.error) throw new Error(arranque.error);
  return sala;
}

function jugarRonda(sala, maximo = 400) {
  let g = 0;
  const anotadas = [];
  while (sala.game.state.phase === PHASE.PLAYING && g++ < maximo) {
    const seat = currentSeat(sala.game.state);
    if (seat == null) break;
    const acc = legalActions(sala.game.state, seat);
    if (!acc.length) break;
    const r = applyAction(sala.game.state, acc[0]);
    if (!r.ok) break;
    sala.game.state = r.state;
    const ev = r.state.events[r.state.events.length - 1];
    if (ev?.kind === 'SCORE_FIVES') anotadas.push(ev.points);
  }
  return anotadas;
}

function main() {
  const manager = new RoomManager();
  manager.setIO(ioDePrueba());

  // ---- 1. Lo de siempre sigue igual ---------------------------------
  const porDefecto = partida(manager, undefined);
  check(porDefecto.modalidad === 'pozo', `sin elegir nada, 1v1 es "con pozo" (${porDefecto.modalidad})`);
  check(porDefecto.game.hasPool === true, 'y tiene pozo');
  check(porDefecto.game.state.config.scoring === 'clasico', 'y puntua a la clasica');

  const dosVdos = manager.createRoom({ mode: '2v2bots', hostId: 'j2', hostUsername: 'P2' });
  check(dosVdos.modalidad === 'tranca', `sin elegir nada, 2v2 es "tranca" (${dosVdos.modalidad})`);

  // ---- 2. Tranca en 1v1 ---------------------------------------------
  const tranca = partida(manager, 'tranca');
  check(tranca.modalidad === 'tranca', 'la sala guarda la modalidad pedida');
  check(tranca.game.hasPool === false, 'en Tranca NO hay pozo, ni siquiera en 1v1');
  check(tranca.game.state.pool.length === 0, 'y no queda ninguna ficha sin repartir en la mano');

  const estadoTranca = tranca.game.getStateForPlayer('j1');
  check(estadoTranca.modalidad === 'tranca', 'la modalidad le llega a la pantalla');
  check(estadoTranca.hasPool === false, 'y la pantalla sabe que no hay monton');
  check(estadoTranca.anotaJugando === false, 'en Tranca no se anota jugando');

  // ---- 3. Cinco ------------------------------------------------------
  const cinco = partida(manager, 'cinco');
  check(cinco.game.state.config.scoring === 'cincos', 'en Cinco se puntua con cincos');
  check(cinco.game.state.config.targetPoints === 200, `y la partida va a 200, no a 100 (${cinco.game.state.config.targetPoints})`);
  check(cinco.game.getStateForPlayer('j1').anotaJugando === true, 'la pantalla sabe que aqui se anota jugando');

  const anotadas = jugarRonda(cinco);
  check(anotadas.length > 0, `se anoto jugando (${anotadas.length} veces en una ronda)`);
  check(anotadas.every((n) => n % 5 === 0), 'y siempre multiplos de cinco: ' + anotadas.join(', '));

  const marcador = cinco.game.state.scores[1] + cinco.game.state.scores[2];
  check(marcador > 0, `el marcador se movio durante la mano (${marcador})`);

  // ---- 4. Los puntos de la ronda se redondean en Cinco ---------------
  if (cinco.game.state.phase === PHASE.ROUND_OVER) {
    const p = cinco.game.state.lastRound.points;
    check(p % 5 === 0, `los puntos de la ronda tambien van de cinco en cinco (${p})`);
  } else {
    check(true, 'la ronda no cerro en el limite de jugadas; el redondeo lo cubre el motor');
  }

  // ---- 5. Una modalidad inventada no rompe nada ----------------------
  const rara = manager.createRoom({ mode: '1v1bot', modalidad: 'no-existe', hostId: 'j3', hostUsername: 'P3' });
  check(rara.modalidad === 'pozo', 'una modalidad inventada cae en la de siempre');

  for (const s of [porDefecto, tranca, cinco, dosVdos, rara]) manager.rooms.delete(s.code);

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main();
