// El destranque, jugado de punta a punta por el RoomManager.
//
//   npm run test:destranque
//
// Las pruebas del motor comprueban que la accion RELAYOUT hace lo suyo. Esta
// comprueba lo otro, que es lo que de verdad le pasa al jugador: que el
// servidor lo aplica SOLO, sin que nadie toque un boton, y que despues de eso
// **nunca** se le dice a alguien "no podes jugar" teniendo una ficha que pega.
import {
  applyAction, currentSeat, legalActions, isTerminal, playableMoves,
  necesitaDestrancar, viewFor, ACTION, PHASE, DEFAULT_LAYOUT
} from '@privoytruco/domino-engine';
import { jugadasSinSitio } from '@privoytruco/domino-engine/layout';
import { RoomManager } from './RoomManager.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

/** Un io de mentira: al RoomManager solo le hace falta que exista. */
const ioDePrueba = () => ({
  emit: () => {},
  to: () => ({ emit: () => {} })
});

const PARTIDAS = 60;

function main() {
  const manager = new RoomManager();
  manager.setIO(ioDePrueba());

  let turnos = 0;
  let destranques = 0;
  let injusticias = 0;      // le tocaba robar o pasar teniendo ficha que pega
  let rondasConDestranque = new Set();

  for (let p = 0; p < PARTIDAS; p++) {
    const sala = manager.createRoom({ mode: '1v1bot', hostId: `j-${p}`, hostUsername: `Jugador${p}` });
    const arranque = manager.startGame(sala.code);
    if (arranque.error) {
      check(false, `la sala ${p} tenia que arrancar: ${arranque.error}`);
      return;
    }

    let guardias = 0;
    while (!isTerminal(sala.game.state) && guardias++ < 400) {
      // Esto es lo que hace el servidor de verdad en cada cambio de estado: es
      // ahi dentro donde vive el destranque.
      const antes = JSON.stringify(sala.game.state.board);
      manager.broadcastState(sala);
      if (JSON.stringify(sala.game.state.board) !== antes) {
        destranques++;
        rondasConDestranque.add(`${p}-${sala.game.state.round}`);
      }

      if (sala.game.state.phase === PHASE.ROUND_OVER) {
        const r = applyAction(sala.game.state, { type: ACTION.START_NEXT_ROUND, seat: 0 });
        if (!r.ok) break;
        sala.game.state = r.state;
        continue;
      }

      const seat = currentSeat(sala.game.state);
      if (seat == null) break;
      turnos++;

      // LA INVARIANTE: despues de que el servidor miro la mesa, nadie puede
      // quedarse sin jugar teniendo una ficha que pega con una punta.
      if (sala.game.state.board.length > 0 && playableMoves(sala.game.state, seat).length === 0) {
        const atascadas = jugadasSinSitio(
          sala.game.state.board,
          sala.game.state.hands[seat],
          sala.game.state.ends,
          DEFAULT_LAYOUT
        );
        if (atascadas.length > 0) injusticias++;
      }

      const acciones = legalActions(sala.game.state, seat);
      if (!acciones.length) break;
      const r = applyAction(sala.game.state, acciones[0]);
      if (!r.ok) break;
      sala.game.state = r.state;
    }

    manager.rooms.delete(sala.code);
  }

  console.log('');
  console.log(`  ${PARTIDAS} partidas, ${turnos} turnos jugados`);
  console.log(`  destranques automaticos: ${destranques} (en ${rondasConDestranque.size} rondas)`);
  console.log('');

  check(turnos > 1000, `se jugaron suficientes turnos para que valga (${turnos})`);
  check(destranques > 0, `el servidor destranco solo, sin boton (${destranques} veces)`);
  check(
    injusticias === 0,
    `NADIE se quedo sin jugar teniendo ficha que pega (${injusticias} casos)`
  );

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main();
