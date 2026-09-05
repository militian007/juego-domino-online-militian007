// El pase de batalla: experiencia, niveles, premios, misiones y panas.
//
//   npm run test:pase
//
// Se prueba contra la base de verdad, con cuentas de verdad: las tablas del
// pase unen con `users` y una prueba con ids inventados no probaria nada.
import { applyAction, currentSeat, legalActions, isTerminal, PHASE, ACTION } from '@privoytruco/domino-engine';
import { initDatabase, query } from './config/database.js';
import { RoomManager } from './RoomManager.js';
import * as Pase from './models/Pase.js';
import * as Mision from './models/Mision.js';
import * as Invitacion from './models/Invitacion.js';
import * as Desbloqueo from './models/Desbloqueo.js';
import * as Preferencia from './models/Preferencia.js';
import * as Ranking from './models/Ranking.js';
import { TITULOS, esTitulo } from './models/Titulo.js';
import * as Sticker from './models/Sticker.js';
import * as pase from './services/pase.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

async function cuenta(nombre) {
  const { rows } = await query('SELECT id FROM users WHERE username = ?', [nombre]);
  if (rows[0]) return Number(rows[0].id);
  const creado = await query(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id',
    [nombre, `${nombre.toLowerCase()}@pase.local`, 'x']
  );
  return Number(creado.rows[0].id);
}

/** Deja a alguien como recien llegado al pase. */
async function limpiar(userId) {
  await query('DELETE FROM pase_progreso WHERE user_id = ?', [userId]);
  await query('DELETE FROM pase_misiones WHERE user_id = ?', [userId]);
  await query('DELETE FROM invitaciones WHERE invitador_id = ? OR invitado_id = ?', [userId, userId]);
  await query('DELETE FROM desbloqueos WHERE user_id = ?', [userId]);
  await query('DELETE FROM preferencias WHERE user_id = ?', [userId]);
  await query('DELETE FROM ranking WHERE user_id = ?', [userId]);
}

async function main() {
  await initDatabase();

  // ---- 1. La temporada se calcula sola --------------------------------
  const arranque = new Date(Pase.EPOCA);
  check(arranque.getUTCDay() === 1, 'La temporada 1 arranca un lunes');
  check(Pase.temporadaActual(arranque) === 'T1', 'El primer dia cae en la T1');

  const seisSemanas = new Date(Pase.EPOCA + Pase.SEMANAS_POR_TEMPORADA * 7 * 86400000);
  check(Pase.temporadaActual(seisSemanas) === 'T2', 'A las seis semanas empieza la T2 sola');

  const ventana = Pase.ventanaDeTemporada(arranque);
  check(
    new Date(ventana.terminaEn) - new Date(ventana.empiezaEn) === Pase.SEMANAS_POR_TEMPORADA * 7 * 86400000,
    'La temporada dura exactamente seis semanas'
  );

  // ---- 2. La escalera de premios --------------------------------------
  check(Pase.PREMIOS.length === Pase.NIVELES, `La escalera tiene ${Pase.NIVELES} niveles`);
  check(
    Pase.PREMIOS.every((p) => p.gratis.length > 0),
    'Ningun nivel se queda sin premio'
  );
  check(
    Pase.PREMIOS[Pase.NIVELES - 1].gratis.some((p) => p.clave === 'fichas:oro'),
    'El ultimo nivel da las fichas negro y oro'
  );

  const titulosEnLaEscalera = Pase.PREMIOS.flatMap((p) => p.gratis)
    .filter((p) => p.tipo === 'desbloqueo' && p.clave.startsWith('titulo:'))
    .map((p) => p.clave);
  check(
    titulosEnLaEscalera.every(esTitulo),
    `Todos los titulos que reparte existen en el catalogo (${titulosEnLaEscalera.length})`
  );

  check(Pase.nivelDe(0) === 0, 'Con cero experiencia se esta en nivel 0');
  check(Pase.nivelDe(Pase.XP_POR_NIVEL - 1) === 0, 'Un punto antes del nivel, todavia no');
  check(Pase.nivelDe(Pase.XP_POR_NIVEL) === 1, 'Al llegar a los 100 se sube al 1');
  check(
    Pase.nivelDe(Pase.XP_POR_NIVEL * 999) === Pase.NIVELES,
    'La experiencia de mas no pasa del ultimo nivel'
  );

  // ---- 3. Subir de nivel entrega el premio -----------------------------
  const uno = await cuenta('PaseUno');
  await limpiar(uno);

  const nada = await Pase.de(uno);
  check(nada.xp === 0 && nada.nivel === 0, 'El que no jugo arranca en cero');

  const r1 = await Pase.sumarXp(uno, 250);
  check(r1.nivel === 2 && r1.xp === 250, 'Doscientos cincuenta de experiencia son dos niveles');
  check(r1.premios.length >= 2, 'Y se entregan los premios de los dos niveles');

  const puntosTrasDosNiveles = (await Ranking.de(uno)).puntos;
  check(puntosTrasDosNiveles > 0, `Los puntos de club llegaron (${puntosTrasDosNiveles})`);

  // El nivel 5 da un titulo.
  await Pase.sumarXp(uno, 300);
  check(await Desbloqueo.tiene(uno, 'titulo:tranquero'), 'Al llegar al nivel 5 se gana el titulo');

  // ---- 4. Los premios no se pagan dos veces ---------------------------
  const antesDeRepetir = (await Ranking.de(uno)).puntos;
  const repetido = await Pase.sumarXp(uno, 0);
  check(repetido.premios.length === 0, 'Sumar cero experiencia no entrega nada');
  check((await Ranking.de(uno)).puntos === antesDeRepetir, 'Y no mueve los puntos');

  const ficha = await Pase.de(uno);
  check(ficha.nivelCobrado === ficha.nivel, 'Queda anotado hasta que nivel se pago');

  // ---- 5. Llegar al final da las fichas de oro ------------------------
  const dos = await cuenta('PaseDos');
  await limpiar(dos);
  const alTope = await Pase.sumarXp(dos, Pase.XP_POR_NIVEL * Pase.NIVELES);
  check(alTope.nivel === Pase.NIVELES, 'Se puede llegar al ultimo nivel');
  check(await Desbloqueo.tiene(dos, 'fichas:oro'), 'Y ahi se ganan las fichas negro y oro');

  // ---- 6. Las misiones son las mismas para todos ----------------------
  const hoy = Mision.activas();
  const otraVez = Mision.activas();
  check(
    hoy.map((m) => m.clave).join() === otraVez.map((m) => m.clave).join(),
    'Las misiones del dia salen siempre iguales'
  );
  check(
    hoy.filter((m) => m.clase === 'diaria').length === Mision.CUANTAS_DIARIAS,
    `Hay ${Mision.CUANTAS_DIARIAS} diarias`
  );
  check(
    hoy.filter((m) => m.clase === 'semanal').length === Mision.CUANTAS_SEMANALES,
    `Hay ${Mision.CUANTAS_SEMANALES} semanales`
  );
  check(
    hoy.some((m) => m.clave === 't-panas'),
    'La mision de los panas esta siempre activa'
  );

  const manana = new Date(Date.now() + 86400000);
  const pasado = new Date(Date.now() + 5 * 86400000);
  const cambian =
    Mision.activas(manana).map((m) => m.clave).join() !==
      Mision.activas().map((m) => m.clave).join() ||
    Mision.activas(pasado).map((m) => m.clave).join() !==
      Mision.activas().map((m) => m.clave).join();
  check(cambian, 'Y cambian de un dia para otro');

  // ---- 7. Una mision se completa y paga -------------------------------
  const tres = await cuenta('PaseTres');
  await limpiar(tres);

  const misionDePartidas = Mision.activas().find((m) => m.clave === 't-veterano');
  const antesDeJugar = await Pase.de(tres);
  await Mision.avanzar(tres, 'partida', misionDePartidas.meta - 1);
  check((await Pase.de(tres)).xp === antesDeJugar.xp, 'Una mision a medias no paga nada');

  const hechas = await Mision.avanzar(tres, 'partida', 1);
  check(
    hechas.some((m) => m.clave === 't-veterano'),
    'Al llegar a la meta la mision se completa'
  );
  check((await Pase.de(tres)).xp >= misionDePartidas.xp, 'Y paga su experiencia');

  const otraMas = await Mision.avanzar(tres, 'partida', 50);
  check(
    !otraMas.some((m) => m.clave === 't-veterano'),
    'Una mision ya cobrada no se vuelve a pagar'
  );

  const estado = await Mision.estadoDe(tres);
  check(
    estado.find((m) => m.clave === 't-veterano')?.hecha === true,
    'La pantalla la ve como hecha'
  );
  check(
    estado.every((m) => m.progreso <= m.meta),
    'El progreso que se muestra nunca pasa de la meta'
  );

  // ---- 8. Contra el bot se gana menos, y con tope ---------------------
  const cuatro = await cuenta('PaseCuatro');
  await limpiar(cuatro);

  const jugarleAlBot = async (veces) => {
    for (let i = 0; i < veces; i++) {
      await pase.alTerminarPartida({
        jugadores: [{ userId: cuatro, gano: true }],
        modo: '1v1',
        conBots: true,
        puntosDelRival: { [cuatro]: 0 }
      });
    }
  };

  await jugarleAlBot(20);

  const tope = await Mision.contador(cuatro, 'tope:bots', Pase.diaActual());
  check(
    tope.progreso === pase.TOPE_BOTS_DIA,
    `Las partidas contra el bot dan como mucho ${pase.TOPE_BOTS_DIA} de experiencia al dia (dieron ${tope.progreso})`
  );

  // Las misiones del dia SI las completa el bot, a proposito: son la tarea del
  // dia y cada una se cobra una sola vez, asi que no se pueden repetir. Lo que
  // no se puede es seguir sacando experiencia por jugar sin parar.
  const trasElTope = (await Pase.de(cuatro)).xp;
  await jugarleAlBot(5);
  check(
    (await Pase.de(cuatro)).xp === trasElTope,
    'Y una vez llegado al tope, seguir jugandole al bot ya no suma nada'
  );

  const cinco = await cuenta('PaseCinco');
  await limpiar(cinco);
  await pase.alTerminarPartida({
    jugadores: [{ userId: cinco, gano: true }],
    modo: '1v1',
    conBots: false,
    puntosDelRival: { [cinco]: 80 }
  });
  const contraPersona = await Pase.de(cinco);
  check(
    contraPersona.xp >= pase.XP_VICTORIA,
    `Una sola victoria contra una persona da mas que veinte contra el bot (${contraPersona.xp})`
  );

  // La paliza solo cuenta si el rival quedo abajo de 30.
  const seis = await cuenta('PaseSeis');
  await limpiar(seis);
  await pase.alTerminarPartida({
    jugadores: [{ userId: seis, gano: true }],
    modo: '1v1',
    conBots: false,
    puntosDelRival: { [seis]: 12 }
  });
  const palizas = await Mision.contador(seis, 'd-paliza', Pase.diaActual());
  const hayMisionDePaliza = Mision.activas().some((m) => m.clave === 'd-paliza');
  check(
    !hayMisionDePaliza || palizas.progreso === 1,
    'Ganar dejando al rival abajo de 30 cuenta como paliza'
  );

  // ---- 9. Los panas ----------------------------------------------------
  const padrino = await cuenta('PasePadrino');
  await limpiar(padrino);
  const panas = [];
  for (const nombre of ['PasePana1', 'PasePana2', 'PasePana3']) {
    const id = await cuenta(nombre);
    await limpiar(id);
    panas.push(id);
  }

  check(
    (await Invitacion.registrar('PasePadrino', padrino)) === false,
    'Nadie se invita a si mismo'
  );
  check(
    (await Invitacion.registrar('NoExisteEsteNombre', panas[0])) === false,
    'Un codigo que no existe no anota nada'
  );

  check(await Invitacion.registrar('PasePadrino', panas[0]), 'Se anota que lo trajo un pana');
  check(
    (await Invitacion.registrar('PasePadrino', panas[0])) === false,
    'Un invitado tiene un solo padrino'
  );

  const xpAntesDelPana = (await Pase.de(padrino)).xp;
  const confirmado = await pase.confirmarPana(panas[0]);
  check(confirmado === padrino, 'Cuando el pana juega, se le paga al que lo trajo');
  check(
    (await Pase.de(padrino)).xp === xpAntesDelPana + pase.XP_POR_PANA,
    `Y son ${pase.XP_POR_PANA} de experiencia`
  );

  const xpDespues = (await Pase.de(padrino)).xp;
  check((await pase.confirmarPana(panas[0])) === null, 'El mismo pana no se cobra dos veces');
  check((await Pase.de(padrino)).xp === xpDespues, 'Y no suma de nuevo');

  // Los otros dos, para completar la mision de los tres.
  for (const id of [panas[1], panas[2]]) {
    await Invitacion.registrar('PasePadrino', id);
    await pase.confirmarPana(id);
  }
  check((await Invitacion.confirmados(padrino)) === 3, 'Quedan los tres panas confirmados');
  check(
    await Desbloqueo.tiene(padrino, 'titulo:padrino'),
    'Con los tres panas se gana el titulo de Padrino'
  );

  const misionPanas = (await Mision.estadoDe(padrino)).find((m) => m.clave === 't-panas');
  check(misionPanas?.hecha === true, 'Y la mision queda cumplida');
  check(
    (await Pase.de(padrino)).nivel >= 7,
    `Traer tres panas sube varios niveles de golpe (quedo en ${(await Pase.de(padrino)).nivel})`
  );

  const lista = await Invitacion.deInvitador(padrino);
  check(lista.length === 3 && lista.every((p) => p.jugo), 'La lista de panas se puede mostrar');

  // ---- 10. Los titulos -------------------------------------------------
  check(
    Object.keys(TITULOS).every((c) => c.startsWith('titulo:')),
    'Todas las claves de titulo llevan su prefijo'
  );

  await Preferencia.guardar(padrino, Preferencia.TITULO, 'titulo:padrino');
  check(
    (await Preferencia.leer(padrino, Preferencia.TITULO)) === 'titulo:padrino',
    'Se puede elegir cual titulo mostrar'
  );
  const deVarios = await Preferencia.titulosDe([padrino, panas[0]]);
  check(deVarios[padrino] === 'titulo:padrino', 'Y se leen de a varios para pintar el chat');
  check(deVarios[panas[0]] === undefined, 'El que no eligio ninguno no aparece');

  // ---- 10.5 Los stickers -----------------------------------------------
  const stickersEnLaEscalera = Pase.PREMIOS.flatMap((p) => p.gratis)
    .filter((p) => p.clave?.startsWith('sticker:'))
    .map((p) => p.clave);
  check(
    stickersEnLaEscalera.length > 0 && stickersEnLaEscalera.every(Sticker.esSticker),
    `Todos los stickers que reparte el pase existen en el catalogo (${stickersEnLaEscalera.length})`
  );
  check(
    Sticker.PREMIADOS.every((s) => stickersEnLaEscalera.includes(s.clave)),
    'Y ningun sticker del catalogo se quedo sin nivel que lo reparta'
  );

  const sinNada = await cuenta('PaseSinNada');
  await limpiar(sinNada);

  check(await Sticker.puedeTirar(sinNada, '😂'), 'Los stickers de siempre los tira cualquiera');
  check(
    (await Sticker.puedeTirar(sinNada, '🔥')) === false,
    'El del pase no se puede tirar sin haberlo ganado'
  );
  check(
    (await Sticker.puedeTirar(sinNada, 'te voy a ganar bobo')) === false,
    'Y lo que no es un sticker no se manda: antes se reenviaba cualquier texto'
  );

  await Desbloqueo.dar(sinNada, 'sticker:candela');
  check(await Sticker.puedeTirar(sinNada, '🔥'), 'Una vez ganado, si se puede tirar');

  const catalogo = await Sticker.catalogoPara(sinNada);
  check(catalogo.base.length === Sticker.BASE.length, 'El catalogo trae los de siempre');
  check(
    catalogo.premiados.find((s) => s.clave === 'sticker:candela')?.mio === true,
    'Y marca cual ya es suyo'
  );
  check(
    catalogo.premiados.filter((s) => !s.mio).length === Sticker.PREMIADOS.length - 1,
    'Los demas salen bloqueados'
  );

  // ---- 11. Una partida DE VERDAD llega al pase -------------------------
  //
  // Lo de arriba prueba el pase por dentro. Esto prueba el cable: que una
  // partida jugada por el RoomManager, como en el juego, termine sumando
  // experiencia. Es el unico eslabon que las otras pruebas no tocan.
  const siete = await cuenta('PaseSiete');
  await limpiar(siete);

  const manager = new RoomManager();
  manager.setIO({ emit: () => {}, to: () => ({ emit: () => {} }) });

  const sala = manager.createRoom({ mode: '1v1bot', hostId: siete, hostUsername: 'PaseSiete' });
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
    const r = applyAction(sala.game.state, acciones[0]);
    if (!r.ok) break;
    sala.game.state = r.state;
  }

  check(isTerminal(sala.game.state), 'La partida contra el bot se juega entera');

  manager.broadcastState(sala);
  await new Promise((r) => setTimeout(r, 900));

  const trasLaPartida = await Pase.de(siete);
  check(trasLaPartida.xp > 0, `La partida le sumo experiencia al pase (${trasLaPartida.xp})`);

  const contadorPartidas = await Mision.contador(siete, 't-veterano', Pase.temporadaActual());
  check(contadorPartidas.progreso === 1, 'Y le conto una partida en las misiones');

  const historial = await query('SELECT id FROM partidas WHERE room_code = ?', [sala.code]);
  check(
    historial.rows.length === 0,
    'Pero la partida contra el bot NO entra al historial, como siempre'
  );

  // ---- 12. Lo que ve la pantalla --------------------------------------
  const vista = await pase.estadoPara(padrino);
  check(vista.premios.length === Pase.NIVELES, 'El estado trae la escalera completa');
  check(vista.misiones.length > 0, 'Y las misiones con su progreso');
  check(vista.panas.length === 3, 'Y los panas');
  check(vista.paseOroActivo === false, 'El pase pago viaja apagado, como corresponde hoy');

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err);
  process.exit(1);
});
