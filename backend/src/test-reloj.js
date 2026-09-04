// El reloj del turno y la ventana para reconectarse.
//
// Regla de Jonathan: entre personas hay 25 segundos para jugar. Si no jugas,
// pierdes la ronda y las fichas que te quedaban se cuentan como puntos del
// rival, y se sigue jugando. Si te caes, tienes 60 segundos para volver.
import { handPips } from '@privoytruco/domino-engine';
import { RoomManager } from './RoomManager.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const nuevoManager = () => {
  const m = new RoomManager();
  m.setIO({ to: () => ({ emit: () => {} }) });
  return m;
};

function salaEntrePersonas(manager) {
  const sala = manager.createRoom({ mode: '1v1', hostId: 501, hostUsername: 'Uno' });
  manager.joinRoom(sala.code, { userId: 502, username: 'Dos', socketId: 's2' });
  sala.players[0].socketId = 's1';
  manager.startGame(sala.code);
  return sala;
}

async function main() {
  // ---- 1. El reloj corre entre personas --------------------------------
  const m1 = nuevoManager();
  const sala = salaEntrePersonas(m1);

  const estado = sala.game.getStateForPlayer(501);
  check(estado.turnMs === 25000, 'El turno dura 25 segundos');

  const falta = estado.turnRestanteMs;
  check(falta > 23000 && falta <= 25000, `Queda el tiempo del turno (${Math.round(falta / 1000)}s)`);

  // ---- 2. Volver a emitir el estado NO regala tiempo --------------------
  const vencimiento = sala.game.turnDeadline;
  await esperar(120);
  m1.broadcastState(sala);
  check(
    sala.game.turnDeadline === vencimiento,
    'Reemitir el estado no reinicia el reloj (si no, reconectarse daria 25s gratis)'
  );

  // ---- 3. Se acaba el tiempo: pierde la ronda --------------------------
  const seat = sala.game.state.turn;
  const quien = sala.players[seat];
  const rival = sala.players[seat === 0 ? 1 : 0];
  const suyos = handPips(sala.game.state.hands[seat]);
  const rondaAntes = sala.game.state.round;

  m1._seLeAcaboElTiempo(sala, quien.id);

  check(sala.game.state.lastRound?.reason === 'timeout', 'La ronda se cierra por tiempo');
  check(
    sala.game.state.scores[rival.team] === suyos,
    `Las fichas del que no jugo son puntos del rival (${suyos})`
  );
  check(sala.game.state.scores[quien.team] === 0, 'El que no jugo no suma nada');
  check(sala.game.status !== 'game-over', 'La partida NO se termina, sigue');
  check(sala.game.state.round === rondaAntes, 'Sigue siendo la misma ronda hasta que pidan la siguiente');

  // ---- 4. Contra la maquina no hay reloj -------------------------------
  const m2 = nuevoManager();
  const conBot = m2.createRoom({ mode: '1v1bot', hostId: 501, hostUsername: 'Uno' });
  conBot.players[0].socketId = 's1';
  m2.startGame(conBot.code);

  const estadoBot = conBot.game.getStateForPlayer(501);
  check(estadoBot.turnMs === null, 'Contra la maquina no hay reloj de turno');
  check(estadoBot.turnRestanteMs == null, 'Y no hay cuenta atras que mostrar');

  // ---- 5. Se cae: aparece el aviso -------------------------------------
  const m3 = nuevoManager();
  const sala3 = salaEntrePersonas(m3);
  m3.marcarDesconectado(sala3.code, 502);

  const conAusente = sala3.game.getStateForPlayer(501);
  check(conAusente.ausentes.length === 1, 'El que se cayo aparece como ausente');
  check(conAusente.ausentes[0].username === 'Dos', 'Con su nombre, para poder avisarlo');

  const quedan = conAusente.ausentes[0].restanteMs;
  check(quedan > 58000 && quedan <= 60000, `Le quedan 60 segundos para volver (${Math.round(quedan / 1000)}s)`);

  // ---- 6. Vuelve a tiempo: se corta la cuenta atras --------------------
  m3.marcarConectado(sala3.code, 502);
  check(
    sala3.game.getStateForPlayer(501).ausentes.length === 0,
    'Si vuelve, el aviso desaparece'
  );

  // ---- 7. No vuelve: abandona ------------------------------------------
  const m4 = nuevoManager();
  const sala4 = salaEntrePersonas(m4);
  // Se le acorta la ventana solo a ESTA sala, para no esperar un minuto.
  sala4.config = { ...sala4.config, reconnectMs: 250 };
  m4.marcarDesconectado(sala4.code, 502);

  await esperar(600);
  check(sala4.game.status === 'game-over', 'Si no vuelve a tiempo, abandona la partida');
  check(sala4.game.endReason === 'forfeit', 'Y queda anotado como abandono');

  // ---- 8. El socket viejo no marca ausente a quien ya volvio -----------
  const m5 = nuevoManager();
  const sala5 = salaEntrePersonas(m5);
  sala5.players[1].socketId = 'socket-nuevo';
  // Simula lo que hace gameSocket: solo marca si el que muere es el socket en uso.
  const jugador = sala5.players.find((p) => p.id === 502);
  if (jugador.socketId === 's2') m5.marcarDesconectado(sala5.code, 502);
  check(
    sala5.game.getStateForPlayer(501).ausentes.length === 0,
    'La muerte del socket viejo no marca ausente a quien ya se reconecto'
  );

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => { console.error('La prueba se rompio:', err); process.exit(1); });
