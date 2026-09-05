// El ranking del club.
//
// Reglas de Jonathan: los puntos se mueven segun quien sea el rival, no hay
// temporadas, y el rango mas alto es Retador, donde cada uno tiene su puesto
// (Top 100, Top 500, y de ahi el numero que le toque).
import { applyAction, currentSeat, legalActions, isTerminal, PHASE, ACTION } from '@privoytruco/domino-engine';
import { initDatabase, query } from './config/database.js';
import { RoomManager } from './RoomManager.js';
import * as Ranking from './models/Ranking.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

// Cuentas de prueba, en un rango de ids que no pisa a nadie.
const BASE = 950000;
const id = (n) => BASE + n;

async function limpiar() {
  await query('DELETE FROM ranking WHERE user_id >= ?', [BASE]);
}

async function main() {
  await initDatabase();
  await limpiar();

  // ---- 1. Quien nunca jugo -------------------------------------------
  const nuevo = await Ranking.de(id(1));
  check(nuevo.puntos === 1000, 'Quien nunca jugo arranca con 1000 puntos');
  check(nuevo.rango === 'Aficionado', `Y con el rango que le toca (${nuevo.rango})`);
  check(nuevo.partidas === 0, 'Sin partidas jugadas');

  const { rows } = await query('SELECT COUNT(*) AS n FROM ranking WHERE user_id = ?', [id(1)]);
  check(Number(rows[0].n) === 0, 'Consultar el perfil NO le crea fila a quien no jugo');

  // ---- 2. El rival importa -------------------------------------------
  const contraIgual = Ranking.calcularCambio(1000, 1000, true, 50);
  const contraMejor = Ranking.calcularCambio(1000, 1400, true, 50);
  const contraPeor = Ranking.calcularCambio(1000, 600, true, 50);

  check(contraMejor > contraIgual, `Ganarle a uno mejor da mas (${contraMejor} vs ${contraIgual})`);
  check(contraPeor < contraIgual, `Ganarle a uno peor da menos (${contraPeor} vs ${contraIgual})`);
  check(contraPeor >= 1, 'Pero ganar SIEMPRE suma algo, aunque sea 1');

  const perderContraPeor = Ranking.calcularCambio(1400, 1000, false, 50);
  const perderContraMejor = Ranking.calcularCambio(1000, 1400, false, 50);
  check(
    perderContraPeor < perderContraMejor,
    `Perder contra uno peor duele mas (${perderContraPeor} vs ${perderContraMejor})`
  );
  check(perderContraMejor <= -1, 'Y perder SIEMPRE resta algo');

  // ---- 3. Las primeras partidas mueven mas ---------------------------
  const primeras = Ranking.calcularCambio(1000, 1000, true, 2);
  const despues = Ranking.calcularCambio(1000, 1000, true, 40);
  check(primeras > despues, `El que recien empieza se ubica rapido (${primeras} vs ${despues})`);

  // ---- 4. Una partida de verdad --------------------------------------
  const cambios = await Ranking.aplicarPartida([
    { userId: id(1), equipo: 1, gano: true },
    { userId: id(2), equipo: 2, gano: false }
  ]);

  check(cambios.length === 2, 'Se reparten puntos a los dos');
  const ganador = cambios.find((c) => c.userId === id(1));
  const perdedor = cambios.find((c) => c.userId === id(2));
  check(ganador.cambio > 0, `El que gano sube (${ganador.cambio})`);
  check(perdedor.cambio < 0, `El que perdio baja (${perdedor.cambio})`);
  check(
    ganador.cambio === -perdedor.cambio,
    'Entre dos parejos, lo que gana uno es lo que pierde el otro'
  );

  const guardado = await Ranking.de(id(1));
  check(guardado.puntos === ganador.despues, 'Los puntos quedan guardados');
  check(guardado.partidas === 1 && guardado.ganadas === 1, 'Y se cuentan sus partidas');

  // ---- 5. El orden no cambia el resultado ----------------------------
  //
  // Si se fuera guardando sobre la marcha, el segundo se mediria contra los
  // puntos ya cambiados del primero y la misma partida daria distinto.
  await limpiar();
  const alDerecho = await Ranking.aplicarPartida([
    { userId: id(10), equipo: 1, gano: true },
    { userId: id(11), equipo: 2, gano: false }
  ]);
  await limpiar();
  const alReves = await Ranking.aplicarPartida([
    { userId: id(11), equipo: 2, gano: false },
    { userId: id(10), equipo: 1, gano: true }
  ]);
  check(
    alDerecho.find((c) => c.userId === id(10)).cambio === alReves.find((c) => c.userId === id(10)).cambio,
    'El orden de los jugadores no cambia los puntos'
  );

  // ---- 6. Los invitados no ensucian nada ------------------------------
  await limpiar();
  const conInvitado = await Ranking.aplicarPartida([
    { userId: id(20), equipo: 1, gano: true },
    { userId: 'guest-abc123', equipo: 2, gano: false }
  ]);
  check(conInvitado.length === 0, 'Si el rival es un invitado, no se reparten puntos');

  // ---- 7. La escalera --------------------------------------------------
  check(Ranking.rangoDe(0) === 'Novato', 'Con 0 puntos, Novato');
  check(Ranking.rangoDe(1000) === 'Aficionado', 'Con 1000, Aficionado');
  check(Ranking.rangoDe(1749) === 'Gran Maestro', 'Con 1749, Gran Maestro');
  check(Ranking.rangoDe(1750) === 'Retador', 'Con 1750, Retador');
  check(Ranking.rangoDe(99999) === 'Retador', 'Retador no tiene techo');

  const falta = Ranking.faltaParaElSiguiente(1000);
  check(falta?.rango === 'Jugador de Club' && falta.faltan === 150, 'Dice cuanto falta para el siguiente');
  check(Ranking.faltaParaElSiguiente(2000) === null, 'Al Retador no le falta nada: es el ultimo');

  // ---- 8. El puesto dentro de Retador ---------------------------------
  await limpiar();
  // Tres retadores con puntajes distintos y uno que no llego.
  await Ranking.guardar({ userId: id(30), puntos: 2100, partidas: 40, ganadas: 30, mejorPuntos: 2100 });
  await Ranking.guardar({ userId: id(31), puntos: 1900, partidas: 40, ganadas: 25, mejorPuntos: 1900 });
  await Ranking.guardar({ userId: id(32), puntos: 1800, partidas: 40, ganadas: 22, mejorPuntos: 1800 });
  await Ranking.guardar({ userId: id(33), puntos: 1200, partidas: 40, ganadas: 15, mejorPuntos: 1200 });

  // El puesto se comprueba CONTRA LO QUE HAYA en la base, no suponiendo que
  // esta vacia. El primer intento daba por sentado que los unicos retadores
  // eran los de prueba, y fallaba en cuanto habia jugadores de verdad.
  const arribaDe = async (puntos) => {
    const { rows: r } = await query(
      'SELECT COUNT(*) AS n FROM ranking WHERE puntos >= ? AND puntos > ?',
      [Ranking.PUNTOS_DE_RETADOR, puntos]
    );
    return Number(r[0].n);
  };

  const puesto30 = await Ranking.puestoDeRetador(id(30), 2100);
  const puesto31 = await Ranking.puestoDeRetador(id(31), 1900);
  const puesto32 = await Ranking.puestoDeRetador(id(32), 1800);

  check(puesto30 === (await arribaDe(2100)) + 1, 'El puesto es cuantos tienen mas puntos, mas uno');
  check(puesto31 === (await arribaDe(1900)) + 1, 'Lo mismo para el segundo');
  check(puesto32 === (await arribaDe(1800)) + 1, 'Y para el tercero');

  // Entre ellos puede haber jugadores de verdad, asi que los puestos no tienen
  // por que ir seguidos; lo que si tiene que cumplirse es el orden.
  check(puesto30 < puesto31 && puesto31 < puesto32, 'A menos puntos, peor puesto');
  check(await Ranking.puestoDeRetador(id(33), 1200) === null, 'Quien no llego a Retador no tiene puesto');
  check(await Ranking.cuantosRetadores() >= 3, 'Se cuenta cuantos llegaron a Retador');

  // ---- 9. Las distinciones --------------------------------------------
  check(Ranking.distincionDeRetador(1) === 'Top 100', 'El puesto 1 es Top 100');
  check(Ranking.distincionDeRetador(100) === 'Top 100', 'El 100 todavia es Top 100');
  check(Ranking.distincionDeRetador(101) === 'Top 500', 'El 101 pasa a Top 500');
  check(Ranking.distincionDeRetador(500) === 'Top 500', 'El 500 todavia es Top 500');
  check(Ranking.distincionDeRetador(501) === '#501', 'Del 501 en adelante va el numero');
  check(Ranking.distincionDeRetador(1234) === '#1234', 'Y sigue con el que le toque');

  // ---- 10. No se baja de cierto piso ----------------------------------
  await Ranking.guardar({ userId: id(40), puntos: -500, partidas: 5, ganadas: 0, mejorPuntos: 1000 });
  const hundido = await Ranking.de(id(40));
  check(hundido.puntos > 0, `Nadie baja a numeros ridiculos (quedo en ${hundido.puntos})`);

  // ---- 11. El mejor puntaje se guarda ---------------------------------
  await Ranking.guardar({ userId: id(41), puntos: 1500, partidas: 20, ganadas: 12, mejorPuntos: 1500 });
  await Ranking.guardar({ userId: id(41), puntos: 1300, partidas: 21, ganadas: 12, mejorPuntos: 1500 });
  const bajo = await Ranking.de(id(41));
  check(bajo.puntos === 1300 && bajo.mejorPuntos === 1500, 'Se recuerda el mejor puntaje que alcanzo');

  // ---- 12. Una partida completa de verdad -----------------------------
  //
  // Con el RoomManager y el motor reales, para comprobar que el enganche del
  // final de partida existe y funciona, no solo que la cuenta esta bien.
  await limpiar();

  const avisos = [];
  const manager = new RoomManager();
  manager.setIO({
    to: (socketId) => ({
      emit: (evento, datos) => { if (evento === 'ranking:cambio') avisos.push({ socketId, datos }); }
    })
  });

  const sala = manager.createRoom({ mode: '1v1', hostId: id(50), hostUsername: 'UnoDePrueba' });
  manager.joinRoom(sala.code, { userId: id(51), username: 'DosDePrueba', socketId: 's51' });
  sala.players[0].socketId = 's50';
  manager.startGame(sala.code);

  let guardias = 0;
  while (!isTerminal(sala.game.state) && guardias++ < 5000) {
    if (sala.game.state.phase === PHASE.ROUND_OVER) {
      const r = applyAction(sala.game.state, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      if (!r.ok) break;
      sala.game.state = r.state;
      continue;
    }
    const seat = currentSeat(sala.game.state);
    if (seat == null) break;
    const acciones = legalActions(sala.game.state, seat);
    if (!acciones.length) break;
    const r = applyAction(sala.game.state, seat === 0 ? acciones[0] : acciones[acciones.length - 1]);
    if (!r.ok) break;
    sala.game.state = r.state;
  }

  check(sala.game.status === 'game-over', 'La partida de prueba llega a su final');

  manager.broadcastState(sala);
  await new Promise((r) => setTimeout(r, 600));

  const uno = await Ranking.de(id(50));
  const dos = await Ranking.de(id(51));

  check(uno.partidas === 1 && dos.partidas === 1, 'A los dos se les cuenta la partida');
  check(uno.puntos !== 1000 && dos.puntos !== 1000, 'A los dos se les movieron los puntos');
  check(
    (uno.puntos > 1000) !== (dos.puntos > 1000),
    'Uno subio y el otro bajo, no los dos para el mismo lado'
  );
  check(avisos.length === 2, 'Y a cada uno le llega el aviso de cuanto se movio');

  // ---- 13. Contra la maquina no suma nada ------------------------------
  await limpiar();
  const conBot = manager.createRoom({ mode: '1v1bot', hostId: id(60), hostUsername: 'UnoDePrueba' });
  conBot.players[0].socketId = 's60';
  manager.startGame(conBot.code);

  guardias = 0;
  while (!isTerminal(conBot.game.state) && guardias++ < 5000) {
    if (conBot.game.state.phase === PHASE.ROUND_OVER) {
      const r = applyAction(conBot.game.state, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      if (!r.ok) break;
      conBot.game.state = r.state;
      continue;
    }
    const seat = currentSeat(conBot.game.state);
    if (seat == null) break;
    const acciones = legalActions(conBot.game.state, seat);
    if (!acciones.length) break;
    const r = applyAction(conBot.game.state, acciones[0]);
    if (!r.ok) break;
    conBot.game.state = r.state;
  }
  manager.broadcastState(conBot);
  await new Promise((r) => setTimeout(r, 500));

  const trasElBot = await Ranking.de(id(60));
  check(trasElBot.partidas === 0, 'Una partida contra la maquina NO mueve el ranking');

  await limpiar();

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err);
  process.exit(1);
});
