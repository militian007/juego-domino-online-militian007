// La clasificacion del club.
//
// Hecha igual a la de PrivoyTruco: puntos y puesto, sin rangos con nombre, con
// tres vistas (General, Esta semana, Torneos). Los puntos se mueven segun quien
// sea el rival. Decisiones de Jonathan.
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
  await query('DELETE FROM ranking_semana WHERE user_id >= ?', [BASE]);
}

/**
 * Crea una cuenta de verdad y devuelve su id.
 *
 * Las tablas unen con `users`, asi que un id inventado no aparece en ellas.
 * Para probar las tablas hace falta gente que exista.
 */
async function cuentaDePrueba(nombre) {
  const { rows } = await query('SELECT id FROM users WHERE username = ?', [nombre]);
  if (rows[0]) return Number(rows[0].id);
  const creado = await query(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id',
    [nombre, `${nombre.toLowerCase()}@prueba.local`, 'x']
  );
  return Number(creado.rows[0].id);
}

async function main() {
  await initDatabase();
  await limpiar();

  // ---- 1. Quien nunca jugo -------------------------------------------
  const nuevo = await Ranking.de(id(1));
  check(nuevo.puntos === 0, 'Quien nunca jugo arranca en cero');
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
  //
  // Se les dan puntos primero: desde cero el que pierde no baja nada, porque
  // nadie baja de cero, y no se podria comprobar que lo que gana uno es lo que
  // pierde el otro.
  await Ranking.guardar({ userId: id(1), puntos: 500, partidas: 20, ganadas: 10, mejorPuntos: 500 });
  await Ranking.guardar({ userId: id(2), puntos: 500, partidas: 20, ganadas: 10, mejorPuntos: 500 });

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
  check(guardado.partidas === 21 && guardado.ganadas === 11, 'Y se cuentan sus partidas');

  // ---- 5. El orden no cambia el resultado ----------------------------
  //
  // Si se fuera guardando sobre la marcha, el segundo se mediria contra los
  // puntos ya cambiados del primero y la misma partida daria distinto.
  const conPuntos = async () => {
    await limpiar();
    await Ranking.guardar({ userId: id(10), puntos: 700, partidas: 30, ganadas: 15, mejorPuntos: 700 });
    await Ranking.guardar({ userId: id(11), puntos: 400, partidas: 30, ganadas: 12, mejorPuntos: 400 });
  };

  await conPuntos();
  const alDerecho = await Ranking.aplicarPartida([
    { userId: id(10), equipo: 1, gano: true },
    { userId: id(11), equipo: 2, gano: false }
  ]);
  await conPuntos();
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

  // ---- 7. El puesto sale de los puntos --------------------------------
  //
  // Con cuentas de verdad: las tablas unen con `users`, asi que alguien que no
  // existe como cuenta se guarda pero no aparece en la tabla.
  await limpiar();
  const alto = await cuentaDePrueba('TablaAlto');
  const medio = await cuentaDePrueba('TablaMedio');
  const bajo = await cuentaDePrueba('TablaBajo');
  await query('DELETE FROM ranking WHERE user_id IN (?, ?, ?)', [alto, medio, bajo]);

  await Ranking.guardar({ userId: alto, puntos: 2100, partidas: 40, ganadas: 30, mejorPuntos: 2100 });
  await Ranking.guardar({ userId: medio, puntos: 1900, partidas: 40, ganadas: 25, mejorPuntos: 1900 });
  await Ranking.guardar({ userId: bajo, puntos: 1800, partidas: 40, ganadas: 22, mejorPuntos: 1800 });

  // Se comprueba CONTRA LO QUE HAYA en la base, no suponiendo que esta vacia.
  const arribaDe = async (puntos) => {
    const { rows: r } = await query('SELECT COUNT(*) AS n FROM ranking WHERE puntos > ?', [puntos]);
    return Number(r[0].n);
  };

  const puesto30 = await Ranking.puestoDe(2100);
  const puesto31 = await Ranking.puestoDe(1900);
  const puesto32 = await Ranking.puestoDe(1800);

  check(puesto30 === (await arribaDe(2100)) + 1, 'El puesto es cuantos tienen mas puntos, mas uno');
  check(puesto30 < puesto31 && puesto31 < puesto32, 'A menos puntos, peor puesto');

  // ---- 8. La tabla general --------------------------------------------
  const general = await Ranking.tablaGeneral(10);
  check(general.length > 0, 'La tabla general trae gente');
  check(
    general.every((f, k) => k === 0 || general[k - 1].puntos >= f.puntos),
    'Y viene ordenada de mas a menos puntos'
  );
  check(
    general[0].puesto === 1 && typeof general[0].porcentaje === 'number',
    'Cada fila trae su puesto y su porcentaje de victorias'
  );

  // ---- 9. Los porcentajes ---------------------------------------------
  check(Ranking.porcentaje(55, 100) === 55, 'El porcentaje se calcula bien');
  check(Ranking.porcentaje(0, 0) === 0, 'Sin partidas, el porcentaje es cero y no se rompe');

  // ---- 9b. La tabla de la semana ---------------------------------------
  //
  // Con cuentas de verdad, porque las tablas unen con `users`: un id inventado
  // se guarda igual pero no aparece en la tabla, que es justo lo que se quiere
  // comprobar aca.
  const gana = await cuentaDePrueba('SemanaGana');
  const pierde = await cuentaDePrueba('SemanaPierde');
  await query('DELETE FROM ranking WHERE user_id IN (?, ?)', [gana, pierde]);
  await query('DELETE FROM ranking_semana WHERE user_id IN (?, ?)', [gana, pierde]);

  await Ranking.aplicarPartida([
    { userId: gana, equipo: 1, gano: true },
    { userId: pierde, equipo: 2, gano: false }
  ]);

  const miSemana = await Ranking.semanaDe(gana);
  check(miSemana.puntos > 0 && miSemana.victorias === 1, 'La semana cuenta los puntos y la victoria');

  const perdedorSemana = await Ranking.semanaDe(pierde);
  check(perdedorSemana.victorias === 0, 'Al que pierde no le suma victoria');

  const semanal = await Ranking.tablaSemanal(200);
  check(semanal.some((f) => f.userId === gana), 'Y aparece en la tabla de la semana');

  // Dos partidas en la misma semana se acumulan en la misma fila.
  await Ranking.aplicarPartida([
    { userId: gana, equipo: 1, gano: true },
    { userId: pierde, equipo: 2, gano: false }
  ]);
  const dosPartidas = await Ranking.semanaDe(gana);
  check(dosPartidas.victorias === 2, 'Dos partidas en la misma semana se suman en la misma fila');

  await query('DELETE FROM ranking WHERE user_id IN (?, ?)', [gana, pierde]);
  await query('DELETE FROM ranking_semana WHERE user_id IN (?, ?)', [gana, pierde]);

  check(/^\d{4}-W\d{2}$/.test(Ranking.semanaActual()), `La semana se identifica bien (${Ranking.semanaActual()})`);

  // ---- 10. No se baja de cierto piso ----------------------------------
  await Ranking.guardar({ userId: id(40), puntos: -500, partidas: 5, ganadas: 0, mejorPuntos: 300 });
  const hundido = await Ranking.de(id(40));
  check(hundido.puntos === 0, 'Nadie baja de cero, aunque pierda mucho');

  // ---- 11. El mejor puntaje se guarda ---------------------------------
  await Ranking.guardar({ userId: id(41), puntos: 1500, partidas: 20, ganadas: 12, mejorPuntos: 1500 });
  await Ranking.guardar({ userId: id(41), puntos: 1300, partidas: 21, ganadas: 12, mejorPuntos: 1500 });
  const trasBajar = await Ranking.de(id(41));
  check(
    trasBajar.puntos === 1300 && trasBajar.mejorPuntos === 1500,
    'Se recuerda el mejor puntaje que alcanzo'
  );

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
  check(
    (uno.puntos > 0) !== (dos.puntos > 0),
    'Solo el que gano suma; desde cero, perder no cuesta nada'
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
  await query('DELETE FROM ranking WHERE user_id IN (?, ?, ?)', [alto, medio, bajo]);

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err);
  process.exit(1);
});
