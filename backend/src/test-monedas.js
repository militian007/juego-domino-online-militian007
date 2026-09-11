// Las monedas del club (§133).
//
//   npm run test:monedas
//
// No hace falta el servidor: se prueba el modelo contra la base directamente.
//
// Lo que se comprueba no es "suma y resta", que es lo facil. Es lo que rompe un
// sistema de monedas de verdad: **pagar dos veces por lo mismo** y **quedar en
// negativo**.
import 'dotenv/config';
import { query, initDatabase } from './config/database.js';
import * as Moneda from './models/Moneda.js';
import { RoomManager } from './RoomManager.js';
import { applyAction, currentSeat, legalActions, isTerminal, ACTION, PHASE } from '@privoytruco/domino-engine';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

const UNO = 930001;
const DOS = 930002;

async function limpiar() {
  for (const id of [UNO, DOS]) {
    await query('DELETE FROM monedas_movimientos WHERE user_id = ?', [id]);
    await query('DELETE FROM monedas WHERE user_id = ?', [id]);
  }
}

async function main() {
  // La prueba se vale por si misma: crea las tablas si no estan, en vez de
  // depender de que alguien haya levantado el servidor antes.
  await initDatabase();
  await limpiar();

  // ---- 1. De cero ------------------------------------------------------
  const vacio = await Moneda.de(UNO);
  check(vacio.saldo === 0, 'quien nunca jugo tiene cero, sin fila ni error');
  check(vacio.ganadasTotal === 0 && vacio.gastadasTotal === 0, 'y sus totales tambien');

  // ---- 2. Ganar --------------------------------------------------------
  const dado = await Moneda.dar(UNO, 50, 'prueba', 'ref-1');
  check(dado === 50, 'se le dan 50 monedas');
  check((await Moneda.de(UNO)).saldo === 50, 'y el saldo queda en 50');

  // ---- 3. LO IMPORTANTE: no pagar dos veces por lo mismo ---------------
  const repetido = await Moneda.dar(UNO, 50, 'prueba', 'ref-1');
  check(repetido === 0, 'la MISMA referencia no vuelve a pagar');
  check((await Moneda.de(UNO)).saldo === 50, 'y el saldo no se movio');

  const otraRef = await Moneda.dar(UNO, 10, 'prueba', 'ref-2');
  check(otraRef === 10, 'pero otra referencia si paga');
  check((await Moneda.de(UNO)).saldo === 60, `saldo en 60 (${(await Moneda.de(UNO)).saldo})`);

  // ---- 4. Gastar -------------------------------------------------------
  const compra = await Moneda.cobrar(UNO, 25, 'compra', 'item-1');
  check(compra.ok === true, 'se le cobran 25');
  check(compra.saldo === 35, `y queda con 35 (${compra.saldo})`);

  // ---- 5. LO OTRO IMPORTANTE: nunca en negativo ------------------------
  const sinPlata = await Moneda.cobrar(UNO, 9999, 'compra', 'item-caro');
  check(sinPlata.ok === false, 'no se puede gastar lo que no se tiene');
  check(/alcanzan/.test(sinPlata.error ?? ''), `y lo dice claro ("${sinPlata.error}")`);
  check((await Moneda.de(UNO)).saldo === 35, 'el saldo sigue en 35, intacto');

  const exacto = await Moneda.cobrar(UNO, 35, 'compra', 'item-2');
  check(exacto.ok === true && exacto.saldo === 0, 'gastar EXACTO lo que queda si se puede');
  const enCero = await Moneda.cobrar(UNO, 1, 'compra', 'item-3');
  check(enCero.ok === false, 'y con cero ya no se puede gastar ni una');

  // ---- 6. Los totales cuentan aparte ----------------------------------
  const totales = await Moneda.de(UNO);
  check(totales.ganadasTotal === 60, `ganadas de por vida: 60 (${totales.ganadasTotal})`);
  check(totales.gastadasTotal === 60, `gastadas de por vida: 60 (${totales.gastadasTotal})`);
  check(totales.saldo === 0, 'y el saldo, cero');

  // ---- 7. Montos raros -------------------------------------------------
  check((await Moneda.dar(UNO, 0, 'raro', 'r0')) === 0, 'dar cero no hace nada');
  check((await Moneda.dar(UNO, -5, 'raro', 'r-neg')) === 0, 'dar en negativo tampoco');
  check((await Moneda.cobrar(UNO, -5, 'raro', 'c-neg')).ok === false, 'cobrar en negativo se rechaza');
  check((await Moneda.de(UNO)).saldo === 0, 'y despues de todo eso el saldo sigue en cero');

  // ---- 8. El pago de una partida --------------------------------------
  await limpiar();
  const pagos = await Moneda.alTerminarPartida(
    [{ userId: UNO, gano: true }, { userId: DOS, gano: false }],
    'MESA01'
  );
  const deUno = await Moneda.de(UNO);
  const deDos = await Moneda.de(DOS);
  const esperadoGanador = Moneda.TARIFAS.partida + Moneda.TARIFAS.victoria + Moneda.TARIFAS.primeraDelDia;
  check(deUno.saldo === esperadoGanador, `el que gana cobra ${esperadoGanador} (${deUno.saldo})`);
  check(deDos.saldo === Moneda.TARIFAS.partida, `el que pierde cobra ${Moneda.TARIFAS.partida} por jugar (${deDos.saldo})`);
  check(pagos.length === 2, 'y se informa de los dos pagos, para poder avisarles');

  // ---- 9. La misma partida contada dos veces NO paga dos veces --------
  await Moneda.alTerminarPartida(
    [{ userId: UNO, gano: true }, { userId: DOS, gano: false }],
    'MESA01'
  );
  check((await Moneda.de(UNO)).saldo === esperadoGanador, 'avisar dos veces de la misma partida no paga dos veces');
  check((await Moneda.de(DOS)).saldo === Moneda.TARIFAS.partida, 'ni al que perdio');

  // ---- 10. La primera del dia es UNA sola ------------------------------
  await Moneda.alTerminarPartida([{ userId: UNO, gano: true }], 'MESA02');
  const trasSegunda = await Moneda.de(UNO);
  const esperadoTras2 = esperadoGanador + Moneda.TARIFAS.partida + Moneda.TARIFAS.victoria;
  check(
    trasSegunda.saldo === esperadoTras2,
    `la segunda victoria del dia NO repite el extra (${trasSegunda.saldo}, esperado ${esperadoTras2})`
  );

  // ---- 11. El detalle explica el saldo --------------------------------
  const movs = await Moneda.movimientos(UNO, 20);
  check(movs.length >= 4, `hay detalle de cada movimiento (${movs.length})`);
  const suma = movs.reduce((a, m) => a + m.cuanto, 0);
  check(suma === trasSegunda.saldo, `el detalle SUMA exactamente el saldo (${suma})`);
  check(movs.some((m) => m.motivo === 'primera-del-dia'), 'y se ve de donde salio cada cosa');

  // ---- 12. CONTRA LA MAQUINA NO SE PAGA -------------------------------
  //
  // Es la regla que sostiene todo lo demas: si pagara, la forma mas rapida de
  // hacerse rico seria jugar solo contra la casa, y las monedas dejarian de
  // significar nada. Se juega una partida entera contra un bot, de verdad, por
  // el mismo RoomManager que corre en produccion.
  await limpiar();
  const manager = new RoomManager();
  manager.setIO({ emit: () => {}, to: () => ({ emit: () => {} }) });

  const sala = manager.createRoom({ mode: '1v1bot', hostId: UNO, hostUsername: 'PruebaMonedas' });
  manager.startGame(sala.code);

  let guardia = 0;
  while (!isTerminal(sala.game.state) && guardia++ < 4000) {
    manager.broadcastState(sala);
    if (sala.game.state.phase === PHASE.ROUND_OVER) {
      const r = applyAction(sala.game.state, { type: ACTION.START_NEXT_ROUND, seat: 0 });
      if (!r.ok) break;
      sala.game.state = r.state;
      continue;
    }
    const seat = currentSeat(sala.game.state);
    if (seat == null) break;
    const acc = legalActions(sala.game.state, seat);
    if (!acc.length) break;
    const r = applyAction(sala.game.state, acc[0]);
    if (!r.ok) break;
    sala.game.state = r.state;
  }

  const termino = isTerminal(sala.game.state);
  check(termino, 'se jugo una partida entera contra la maquina');
  // Es el mismo gancho por el que pasan todas las partidas al terminar:
  // `broadcastState` lo llama solo. Se invoca explicito por si el bucle salio
  // antes de un ultimo broadcast.
  manager._registrarSiTermino(sala);
  manager.rooms.delete(sala.code);
  await new Promise((r) => setTimeout(r, 300));

  const trasBot = await Moneda.de(UNO);
  check(trasBot.saldo === 0, `contra la maquina NO se paga nada (saldo ${trasBot.saldo})`);
  check(Moneda.PAGA_CONTRA_BOTS === false, 'y esta escrito como regla, no escondido en un if');

  await limpiar();

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err.message);
  process.exit(1);
});
