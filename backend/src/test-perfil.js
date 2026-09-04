// ¿Se guardan de verdad las partidas, y se guardan las que corresponde?
//
// Juega dos partidas completas entre dos personas usando el motor de verdad y
// el RoomManager de verdad, y despues pregunta a la base lo mismo que va a
// preguntar el perfil. Tambien comprueba lo que NO se tiene que guardar: las
// partidas contra la maquina.
import {
  applyAction, currentSeat, legalActions, isTerminal, PHASE, ACTION
} from '@privoytruco/domino-engine';
import { RoomManager } from './RoomManager.js';
import { initDatabase } from './config/database.js';
import * as Partida from './models/Partida.js';
import * as ChatGlobal from './models/ChatGlobal.js';

let pasados = 0;
let fallados = 0;

const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

// Un io de mentira: al RoomManager solo le hace falta para emitir, y aca no
// hay nadie escuchando.
const ioFalso = { to: () => ({ emit: () => {} }) };

/** Juega una partida entera, sin bots, hasta que haya ganador. */
function jugarHastaElFinal(room) {
  const game = room.game;
  let guardias = 0;

  while (!isTerminal(game.state) && guardias++ < 2000) {
    if (game.state.phase === PHASE.ROUND_OVER) {
      const r = applyAction(game.state, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      if (!r.ok) break;
      game.state = r.state;
      continue;
    }

    const seat = currentSeat(game.state);
    if (seat == null) break;

    const acciones = legalActions(game.state, seat);
    if (acciones.length === 0) break;

    const r = applyAction(game.state, acciones[0]);
    if (!r.ok) break;
    game.state = r.state;
  }
}

async function main() {
  await initDatabase();

  const manager = new RoomManager();
  manager.setIO(ioFalso);

  // Dos cuentas de verdad no hacen falta para esto: alcanza con ids numericos,
  // que es lo que distingue una cuenta de un invitado.
  const unoId = 900001;
  const dosId = 900002;

  const antes = await Partida.resumenDe(unoId);

  // ---- 1. Una partida entre dos personas se guarda ----------------------
  const sala = manager.createRoom({ mode: '1v1', hostId: unoId, hostUsername: 'UnoDePrueba' });
  manager.joinRoom(sala.code, { userId: dosId, username: 'DosDePrueba', socketId: 'x2' });
  manager.startGame(sala.code);

  jugarHastaElFinal(sala);
  check(sala.game.status === 'game-over', 'La partida entre personas llega a su final');

  manager.broadcastState(sala);
  await new Promise((r) => setTimeout(r, 400));

  const despues = await Partida.resumenDe(unoId);
  check(despues.jugadas === antes.jugadas + 1, 'Queda guardada una partida mas');

  const ganador = sala.game.winningTeam;
  const jugadorUno = sala.players.find((p) => p.id === unoId);
  const teniaQueGanar = jugadorUno.team === ganador;
  check(
    despues.ganadas === antes.ganadas + (teniaQueGanar ? 1 : 0),
    `El resultado coincide con lo que paso (${teniaQueGanar ? 'gano' : 'perdio'})`
  );
  check(
    despues.perdidas === despues.jugadas - despues.ganadas,
    'Ganadas + perdidas da el total, sin partidas sueltas'
  );

  // ---- 2. No se guarda dos veces ----------------------------------------
  manager.broadcastState(sala);
  manager.broadcastState(sala);
  await new Promise((r) => setTimeout(r, 300));

  const otraVez = await Partida.resumenDe(unoId);
  check(otraVez.jugadas === despues.jugadas, 'Volver a emitir el estado NO la guarda de nuevo');

  // ---- 3. El historial dice contra quien y con que puntos ---------------
  const historial = await Partida.historialDe(unoId, 5);
  const ultima = historial[0];
  check(Boolean(ultima), 'El historial trae la partida recien jugada');
  check(ultima?.modo === '1v1', 'Guarda el modo');
  check(
    typeof ultima?.misPuntos === 'number' && typeof ultima?.susPuntos === 'number',
    'Guarda los puntos de los dos lados'
  );
  check(ultima?.gano === teniaQueGanar, 'El historial coincide con el resumen');

  // ---- 4. Las partidas contra la maquina NO se guardan ------------------
  const conBot = manager.createRoom({ mode: '1v1bot', hostId: unoId, hostUsername: 'UnoDePrueba' });
  manager.startGame(conBot.code);
  jugarHastaElFinal(conBot);
  manager.broadcastState(conBot);
  await new Promise((r) => setTimeout(r, 400));

  const trasElBot = await Partida.resumenDe(unoId);
  check(
    trasElBot.jugadas === otraVez.jugadas,
    'Una partida contra la maquina NO entra en el record'
  );

  // ---- 5. El invitado no ensucia la tabla -------------------------------
  check(Partida.esCuenta(900001) === true, 'Un id de cuenta se reconoce como cuenta');
  check(Partida.esCuenta('guest-abc123') === false, 'Un invitado no se guarda como cuenta');

  // ---- 6. Las fechas se guardan como fechas ----------------------------
  //
  // El conversor a SQLite cambiaba TIMESTAMP por DATETIME y de paso pisaba
  // CURRENT_TIMESTAMP, con lo que la fecha quedaba guardada como el texto
  // "CURRENT_DATETIME". Se veia en el perfil como una fecha invalida.
  check(
    !Number.isNaN(new Date(ultima?.jugadaEl).getTime()),
    'La fecha de la partida es una fecha de verdad, no un texto'
  );

  const mensaje = await ChatGlobal.guardar({
    userId: 900001, username: 'UnoDePrueba', texto: 'probando la fecha'
  });
  check(
    !Number.isNaN(new Date(mensaje.creadoEn).getTime()),
    'La hora del mensaje es una hora de verdad'
  );

  // ---- 7. La limpieza del chat -----------------------------------------
  check(ChatGlobal.limpiar('   hola   mundo  ') === 'hola mundo', 'Junta los espacios de mas');
  check(ChatGlobal.limpiar('   ') === null, 'Un mensaje vacio se rechaza');
  check(ChatGlobal.limpiar('a\u0000b\u001Fc') === 'a b c', 'Saca los caracteres invisibles');
  check(ChatGlobal.limpiar('x'.repeat(500)).length === 300, 'Corta el mensaje larguisimo');
  check(ChatGlobal.limpiar(12345) === null, 'Lo que no es texto se rechaza');
  check(
    ChatGlobal.limpiar('<b>hola</b>') === '<b>hola</b>',
    'NO escapa el HTML: eso lo hace React al pintar, escapar dos veces se ve mal'
  );

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err);
  process.exit(1);
});
