// Los torneos: que se programen, que arranquen, que la llave avance y que el
// campeon se lleve sus puntos y su copa.
//
// Copia la forma de "El Relampago" de PrivoyTruco. La diferencia es el premio:
// aca son puntos y una copa, no plata. Decision de Jonathan.
import { applyAction, currentSeat, legalActions, isTerminal, PHASE, ACTION } from '@privoytruco/domino-engine';
import { initDatabase, query } from './config/database.js';
import { RoomManager } from './RoomManager.js';
import * as Torneo from './models/Torneo.js';
import * as Ranking from './models/Ranking.js';
import * as torneos from './services/torneos.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cuentas de verdad: las tablas unen con `users`. */
async function cuenta(nombre) {
  const { rows } = await query('SELECT id FROM users WHERE username = ?', [nombre]);
  if (rows[0]) return Number(rows[0].id);
  const creado = await query(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id',
    [nombre, `${nombre.toLowerCase()}@torneo.local`, 'x']
  );
  return Number(creado.rows[0].id);
}

/** Un io de mentira que apunta lo que se emite. */
function ioDePrueba(bandeja) {
  return {
    emit: (evento, datos) => bandeja.push({ para: '*', evento, datos }),
    to: (sala) => ({
      emit: (evento, datos) => bandeja.push({ para: sala, evento, datos })
    })
  };
}

/** Juega una mesa entera hasta que haya campeon. */
function jugarHastaElFinal(sala) {
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
    // El asiento 0 juega la primera opcion y el 1 la ultima: asi el asiento 0
    // gana casi siempre y la prueba es predecible.
    const r = applyAction(sala.game.state, seat === 0 ? acciones[0] : acciones[acciones.length - 1]);
    if (!r.ok) break;
    sala.game.state = r.state;
  }
}

async function main() {
  await initDatabase();

  // ---- 1. Los horarios caen en punto y media ---------------------------
  const franja = torneos.proximaFranja(new Date('2026-09-05T19:07:00Z'));
  check(
    franja.getUTCMinutes() % 30 === 0 && franja > new Date('2026-09-05T19:07:00Z'),
    `El proximo torneo cae en una franja limpia (${franja.toISOString().slice(11, 16)})`
  );

  // ---- 2. Se programan solos -------------------------------------------
  await query('DELETE FROM torneo_inscritos');
  await query('DELETE FROM torneos');

  await torneos.programar();
  const anunciados = await Torneo.proximos(20);
  check(anunciados.length >= 8, `Quedan varios torneos anunciados (${anunciados.length})`);
  check(anunciados[0].estado === 'anunciado', 'Y estan anunciados, sin empezar');
  check(anunciados[0].premioPuntos > 0, `Con premio en puntos (${anunciados[0].premioPuntos})`);

  // No se duplican al volver a programar.
  await torneos.programar();
  const otraVez = await Torneo.proximos(20);
  check(otraVez.length === anunciados.length, 'Programar dos veces no duplica torneos');

  // ---- 3. Anotarse y borrarse ------------------------------------------
  const uno = await cuenta('TorneoUno');
  const dos = await cuenta('TorneoDos');
  const tres = await cuenta('TorneoTres');
  const torneoId = anunciados[0].id;

  check(await Torneo.anotar(torneoId, uno) === true, 'Se puede anotar');
  check(await Torneo.anotar(torneoId, uno) === false, 'Anotarse dos veces no hace nada');
  check((await Torneo.porId(torneoId)).anotados === 1, 'Se cuenta un anotado');

  await Torneo.borrarse(torneoId, uno);
  check((await Torneo.porId(torneoId)).anotados === 0, 'Y se puede borrar');

  // ---- 4. Sin gente no se juega ----------------------------------------
  const bandeja = [];
  const manager = new RoomManager();
  const io = ioDePrueba(bandeja);
  manager.setIO(io);
  torneos.conectar(io, manager);

  // Se le adelanta la hora para que le toque arrancar.
  const ayer = new Date(Date.now() - 60_000).toISOString();
  await query('UPDATE torneos SET empieza_en = ? WHERE id = ?', [ayer, torneoId]);
  await Torneo.anotar(torneoId, uno);

  await torneos.arrancarLosQueTocan();
  check((await Torneo.porId(torneoId)).estado === 'cancelado', 'Con una sola persona el torneo se cancela');

  // ---- 5. Un torneo de tres, jugado entero -----------------------------
  const conTres = anunciados[1].id;
  await query('UPDATE torneos SET empieza_en = ? WHERE id = ?', [ayer, conTres]);
  for (const id of [uno, dos, tres]) {
    await query('DELETE FROM ranking WHERE user_id = ?', [id]);
    await Torneo.anotar(conTres, id);
  }

  bandeja.length = 0;
  await torneos.arrancarLosQueTocan();

  check((await Torneo.porId(conTres)).estado === 'jugando', 'Con tres personas el torneo arranca');

  const avisosDeMesa = bandeja.filter((b) => b.evento === 'torneo:partida');
  check(avisosDeMesa.length === 2, 'Se arma UNA mesa y a los dos les llega el aviso');

  const pasaDeArriba = bandeja.find(
    (b) => b.evento === 'notif:nueva' && b.datos?.titulo?.includes('pasás de ronda')
  );
  check(Boolean(pasaDeArriba), 'Con numero impar, uno pasa de arriba sin jugar');

  // Se juega la mesa de la primera ronda.
  let mesas = [...manager.rooms.values()].filter((s) => s.torneoId === conTres);
  check(mesas.length === 1, 'Hay una mesa en juego');

  // Los dos "entran": es lo que hace el socket cuando cada uno abre la mesa.
  mesas[0].players.forEach((p, i) => { p.socketId = `s-${i}`; });
  torneos.intentarArrancar(mesas[0]);
  check(mesas[0].started === true, 'La mesa arranca sola cuando estan los dos');

  jugarHastaElFinal(mesas[0]);
  manager.broadcastState(mesas[0]);
  await esperar(900);

  // Ahora quedan dos: el que gano y el que paso de arriba.
  const vivos = await Torneo.enPie(conTres);
  check(vivos.length === 2, `Despues de la primera ronda quedan dos (${vivos.length})`);

  mesas = [...manager.rooms.values()].filter((s) => s.torneoId === conTres && !s.started);
  check(mesas.length === 1, 'Y se arma la final');

  mesas[0].players.forEach((p, i) => { p.socketId = `f-${i}`; });
  torneos.intentarArrancar(mesas[0]);
  jugarHastaElFinal(mesas[0]);
  manager.broadcastState(mesas[0]);
  await esperar(900);

  const terminado = await Torneo.porId(conTres);
  check(terminado.estado === 'terminado', 'El torneo termina');
  check(terminado.campeonId != null, 'Y tiene campeon');

  // ---- 6. El campeon cobra ---------------------------------------------
  const copas = await Torneo.copasDe(terminado.campeonId);
  check(copas === 1, 'El campeon suma una copa');

  const palmares = await Torneo.palmares(5);
  check(
    palmares.some((c) => c.campeonId === terminado.campeonId),
    'Y aparece en el palmares'
  );

  const tablaCopas = await Torneo.tablaDeCopas(10);
  check(
    tablaCopas.some((f) => f.userId === terminado.campeonId && f.copas === 1),
    'Y en la tabla de copas'
  );

  const ficha = await Ranking.de(terminado.campeonId);
  check(
    ficha.puntos >= terminado.premioPuntos,
    `El campeon se llevo al menos los ${terminado.premioPuntos} puntos del premio (quedo en ${ficha.puntos})`
  );

  // ---- 7. El que perdio quedo afuera -----------------------------------
  const alFinal = await Torneo.enPie(conTres);
  check(alFinal.length === 1, 'Al final queda uno solo en pie');
  check(alFinal[0].userId === terminado.campeonId, 'Y es el campeon');

  torneos.apagar();
  await query('DELETE FROM torneo_inscritos');
  await query('DELETE FROM torneos');

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err);
  process.exit(1);
});
