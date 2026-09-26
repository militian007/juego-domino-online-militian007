// LOS TORNEOS Y EL RELAMPAGO (seccion 211), copiados del truco.
//
// Es el contrato de conducta del truco pasado a esta casa: las pruebas de
// tournament-*.test.ts, relampago*.test.ts, tercer-puesto.test.ts,
// torneo-presentes.test.ts y torneo-puerta-abierta.test.ts, contra la base
// (SQLite en un archivo temporal propio) y el RoomManager de verdad, con un io
// de mentira. Incluye un Relampago de 16 con bots jugado ENTERO, de punta a
// punta.
//
//   node src/test-torneos.js
//
// Sale con process.exitCode (nunca process.exit: con SQLite corta la base a
// la mitad).
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const BASE = path.join(os.tmpdir(), `domino-torneos-${process.pid}.db`);
for (const f of [BASE, `${BASE}-wal`, `${BASE}-shm`]) fs.rmSync(f, { force: true });
// Las bases de corridas viejas (mas de una hora) se barren; la de una corrida en curso no.
for (const f of fs.readdirSync(os.tmpdir()).filter((n) => /^domino-torneos-\d+\.db/.test(n))) {
  try {
    const ruta = path.join(os.tmpdir(), f);
    if (Date.now() - fs.statSync(ruta).mtimeMs > 3600_000) fs.rmSync(ruta, { force: true });
  } catch { /* en uso */ }
}
process.env.DATABASE_PATH = BASE;
process.env.BOT_DELAY_MS = process.env.BOT_DELAY_MS ?? '0';
process.env.TORNEO_SIGUIENTE_MANO_MS = process.env.TORNEO_SIGUIENTE_MANO_MS ?? '5';
// Para probar contra Postgres: TORNEOS_DATABASE_URL=postgresql://... (una base de
// prueba, nunca la de verdad). Sin ella, SQLite en el archivo temporal.
if (process.env.TORNEOS_DATABASE_URL) process.env.DATABASE_URL = process.env.TORNEOS_DATABASE_URL;
else delete process.env.DATABASE_URL;

const { initDatabase, query } = await import('./config/database.js');
const Config = await import('./models/Config.js');
const Torneo = await import('./models/Torneo.js');
const torneos = await import('./services/torneos.js');
const cuadro = await import('./services/torneos/cuadro.js');
const relampago = await import('./services/torneos/relampago.js');
const vitrina = await import('./services/torneos/vitrina.js');
const { RoomManager } = await import('./RoomManager.js');
const { Bot } = await import('./game/Bot.js');

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};
const seccion = (t) => console.log(`\n== ${t}`);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarQue(cond, ms = 20000, paso = 10) {
  const hasta = Date.now() + ms;
  while (Date.now() < hasta) {
    if (await cond()) return true;
    await esperar(paso);
  }
  return false;
}
const MIN = 60_000;

// ------------------------------------------------------------ el banco

const online = new Set();
const bandeja = [];
const conectados = new Map();
const io = {
  sockets: { sockets: conectados, adapter: { rooms: new Map() } },
  emit: (ev, d) => bandeja.push({ para: '*', ev, d }),
  to: (sala) => ({ emit: (ev, d) => bandeja.push({ para: sala, ev, d }) })
};
let rm = new RoomManager();
rm.setIO(io);
torneos.conectar(io, rm);
torneos.__pruebas.enLinea = (id) => online.has(String(id));
// Por defecto el proceso «lleva rato» arrancado: la gracia tras reinicio no aplica.
torneos.__pruebas.arranque = Date.now() - 3600_000;

const eventos = (ev, para) => bandeja.filter((b) => b.ev === ev && (para == null || b.para === para));

async function limpiar() {
  await torneos.conCandado(async () => {
    for (const t of ['copa_mesas', 'copa_cruces', 'copa_inscritos', 'copa_torneos', 'copa_ajustes']) await query(`DELETE FROM ${t}`);
  });
  for (const code of [...rm.rooms.keys()]) rm.cerrarMesaDeTorneo(code);
  rm.rooms.clear();
  bandeja.length = 0;
  online.clear();
  torneos.__pruebas.vistos.clear();
}

let seq = 0;
async function cuenta(nombre) {
  const n = `${nombre}${++seq}`;
  const { rows } = await query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id', [n, `${n.toLowerCase()}@torneo.local`, 'x']);
  return { id: Number(rows[0].id), nombre: n, avatar: null };
}
const invitado = (nombre) => ({ id: `guest-${nombre.toLowerCase()}${++seq}abc`, nombre, avatar: 'tigre' });

async function torneoNormal({ gente, relleno = false, premios = [100, 50, 25], cupo = 32, minimo = 2, cuadroMinimo = 16, tipo = 'normal', nombre = 'Copa de prueba' }) {
  const id = await Torneo.crear({ nombre, tipo, empiezaEn: Date.now() + 60 * MIN, puntos: 24, cupo, minimo, relleno, cuadroMinimo, premios, creadoPor: 'prueba' });
  for (const g of gente) {
    const r = await torneos.inscribirse(id, g);
    if (r.error) throw new Error(`no se pudo inscribir a ${g.nombre}: ${r.error}`);
  }
  return id;
}
/** Le adelanta la hora para que le toque arrancar ya. */
const vencer = (id, haceMs = 10 * MIN) => query('UPDATE copa_torneos SET empieza_en = ? WHERE id = ?', [Date.now() - haceMs, id]);
const arrancar = () => torneos.conCandado(() => torneos.arrancarLosQueTocan(Date.now()));
const flush = () => torneos.conCandado(async () => {});

async function mesaDe(cruceId) {
  return (await Torneo.mesasDeCruce(cruceId)).find((m) => m.estado === 'playing') ?? null;
}
/** Una persona entra a su mesa (lo que hace room:join). */
async function entrar(code, userId) {
  const room = rm.rooms.get(code);
  const p = room.players.find((x) => String(x.id) === String(userId));
  const sid = `s-${userId}-${code}`;
  conectados.set(sid, {});
  p.socketId = sid;
  await torneos.alEntrarALaMesa(room, p.id);
  return room;
}
/** Juega el turno de una persona como lo haria el bot (para correr partidas enteras). */
function jugarPor(room, id) {
  const g = room.game;
  if (g.getValidMoves(id).length > 0) {
    const mv = new Bot(g, id, 'normal').chooseMove();
    if (mv) {
      const c = mv.placement || {};
      g.playTile(id, mv.tileIndex, mv.side, c.x, c.y, c.x2, c.y2, c.orientation);
    } else g.pass(id);
  } else if (g.hasPool && g.pool.length > 0) {
    if (!g.drawFromPool(id).ok) g.pass(id);
  } else g.pass(id);
  rm.marcarJugadaPropia(room, id);
  rm.broadcastState(room);
  rm.playBotTurns(room);
}

await initDatabase();
await Config.sembrar();

// ================================================================ puro
seccion('El cuadro (bracket.ts)');
{
  check(cuadro.nextPow2(5) === 8 && cuadro.nextPow2(1) === 2 && cuadro.prevPow2(20) === 16, 'nextPow2 / prevPow2');
  check(JSON.stringify(cuadro.standardSeedOrder(4)) === '[1,4,2,3]', 'la siembra cruza al 1 con el último');
  const ocho = cuadro.generarCuadro(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  check(ocho.rondas === 3 && ocho.cruces.length === 7 && ocho.cruces.every((c) => !c.bye), '8 jugadores: lleno, sin byes, 3 rondas, 7 cruces');
  const seis = cuadro.generarCuadro(['1', '2', '3', '4', '5', '6']);
  const previa6 = seis.cruces.filter((c) => c.ronda === 1);
  check(previa6.length === 2 && seis.tamano === 4 && seis.rondas === 3, '6 jugadores: RONDA PREVIA de 2, llave de 4');
  const r2 = seis.cruces.filter((c) => c.ronda === 2);
  check(r2.filter((c) => c.a).length + r2.filter((c) => c.b).length === 2 && seis.cruces.every((c) => !c.bye), 'con previa: dos directos esperan en la ronda 2 y cero byes');
  const veinte = cuadro.generarCuadro(Array.from({ length: 20 }, (_, i) => `p${i}`));
  check(veinte.cruces.filter((c) => c.ronda === 1).length === 4 && veinte.tamano === 16, '20 jugadores: previa de 4, llave de 16 llena');
  let error = null;
  try { cuadro.generarCuadro(['x']); } catch (e) { error = e; }
  check(Boolean(error), 'rechaza menos de 2 jugadores');
  let plan = ocho;
  for (const ronda of [1, 2, 3]) {
    for (const c of plan.cruces.filter((x) => x.ronda === ronda)) plan = cuadro.aplicarResultado(plan, c.ronda, c.slot, c.a);
  }
  check(cuadro.campeonDelPlan(plan) === 'a', 'avance completo de 8: gana la siembra 1');
  const otra = cuadro.aplicarResultado(plan, 3, 0, 'a');
  check(cuadro.campeonDelPlan(otra) === 'a', 'idempotente: reaplicar el mismo ganador no cambia nada');
  check(cuadro.tercerPuestoAplica(25, cuadro.generarCuadro(['a', 'b', 'c', 'd'])), 'con premio al 3.º y 4 de cuadro nace el partido por el tercero');
  check(!cuadro.tercerPuestoAplica(0, cuadro.generarCuadro(['a', 'b', 'c', 'd'])), 'sin premio al 3.º no hay partido');
  check(!cuadro.tercerPuestoAplica(25, cuadro.generarCuadro(['a', 'b', 'c'])), 'con 3 (sin dos semis de verdad) tampoco');
}

seccion('Los puestos (el caso Cabito, el caso 16rafa)');
{
  const cs = [
    { id: 1, ronda: 1, slot: 0, a: 'A', b: 'B', ganador: 'A', estado: 'completed', siguienteId: 3 },
    { id: 2, ronda: 1, slot: 1, a: 'C', b: 'D', ganador: 'D', estado: 'completed', siguienteId: 3 },
    { id: 3, ronda: 2, slot: 0, a: 'A', b: 'D', ganador: 'D', estado: 'completed', siguienteId: null },
    { id: 4, ronda: 2, slot: 1, a: 'B', b: 'C', ganador: 'C', estado: 'completed', siguienteId: null }
  ];
  const regs = [{ userId: 'A', siembra: 1 }, { userId: 'B', siembra: 2 }, { userId: 'C', siembra: 3 }, { userId: 'D', siembra: 4 }, { userId: 'FANTASMA', siembra: 0 }];
  const p = cuadro.puestosDelCuadro(cs, regs);
  check(p[0].userId === 'D' && p[1].userId === 'A', 'el 1.º y el 2.º se LEEN de la final, aunque otro tenga mejor siembra');
  check(p[2].userId === 'C' && p[3].userId === 'B', 'el 3.º y el 4.º salen del partido por el tercero, no de la siembra');
  check(p[4].userId === 'FANTASMA', 'el inscrito que no jugó ningún cruce va de último');
  const trabado = cuadro.puestosDelCuadro([
    { id: 1, ronda: 1, slot: 0, a: 'A', b: 'B', ganador: 'A', estado: 'completed', siguienteId: 3 },
    { id: 2, ronda: 1, slot: 1, a: 'C', b: 'D', ganador: null, estado: 'playing', siguienteId: 3 },
    { id: 3, ronda: 2, slot: 0, a: 'A', b: 'X', ganador: 'A', estado: 'completed', siguienteId: null }
  ], [{ userId: 'A', siembra: 3 }, { userId: 'B', siembra: 4 }, { userId: 'C', siembra: 1 }, { userId: 'D', siembra: 2 }, { userId: 'X', siembra: 5 }]);
  check(trabado[1].userId === 'X', 'el caso 16rafa: un cruce que quedó jugando no le regala el segundo a nadie');
  check(cuadro.elegirGanadorWalkover(['h1', 'bot-copa-tigre'], ['h1'], torneos.esBot, () => 9) === 'h1', 'walkover: el humano que dio la cara le gana al bot');
  check(cuadro.elegirGanadorWalkover(['h1', 'bot-copa-tigre'], [], torneos.esBot, () => 1) === 'bot-copa-tigre', 'walkover: un bot NUNCA es no-show');
  check(cuadro.elegirGanadorWalkover(['h1', 'h2'], ['h1', 'h2'], torneos.esBot, (u) => (u === 'h2' ? 1 : 2)) === 'h2', 'walkover: los dos presentes → la mejor siembra');
}

seccion('La puerta abierta (pura) y el llamado');
{
  const cs = [
    { id: 1, ronda: 1, slot: 0, a: 'p4', b: 'p5', ganador: null, estado: 'ready', siguienteId: 10, siguienteLado: 'B' },
    { id: 10, ronda: 2, slot: 0, a: 'p1', b: null, ganador: null, estado: 'pending', siguienteId: 12, siguienteLado: 'A' },
    { id: 11, ronda: 2, slot: 1, a: 'p2', b: 'p3', ganador: null, estado: 'ready', siguienteId: 12, siguienteLado: 'B' }
  ];
  const h = cuadro.huecosDePuerta(cs);
  check(h.length === 1 && h[0].directo === 'p1' && h[0].lado === 'A', 'solo el directo que espera a una previa sin ganador');
  check(cuadro.huecosDePuerta(cs.map((c) => (c.id === 1 ? { ...c, ganador: 'p4' } : c))).length === 0, 'si la previa ya tiene ganador, ya no hay hueco');
  check(cuadro.huecosDePuerta([...cs, { id: 2, ronda: 1, slot: 1, a: 'p1', b: 'tarde', ganador: null, estado: 'ready', siguienteId: 10, siguienteLado: 'A' }]).length === 0, 'si al directo ya lo tomaron, no se vuelve a tomar');
  const l1 = cuadro.llamadoDeTorneo(1, 4, 'El Tigre', 3, 13);
  check(l1.title === 'Se abrió el salón' && l1.body.includes('Entran 13'), 'el llamado de la ronda 1 dice cuántos entran de verdad');
  check(cuadro.llamadoDeTorneo(4, 4, 'Yubi', 3).title === 'Queda una mesa prendida', 'la final: «Queda una mesa prendida»');
  check(cuadro.llamadoDeTorneo(3, 4, 'Yubi', 3).title === 'Quedan cuatro', 'la semifinal: «Quedan cuatro»');
}

seccion('Los recordatorios (reglas)');
{
  const t0 = Date.parse('2026-09-26T23:00:00Z');
  const hitos = cuadro.normalizarHitos([5, '10', 0, 'x', 10]);
  check(JSON.stringify(hitos) === '[10,5]', 'ordena de mayor a menor y descarta basura');
  check(cuadro.hitoQueToca(t0, hitos, null, t0 - 12 * MIN) === null, 'no avisa cuando falta más que el hito más grande');
  check(cuadro.hitoQueToca(t0, hitos, null, t0 - 9 * MIN) === 10, 'avisa el de 10 apenas entra en la ventana');
  check(cuadro.hitoQueToca(t0, hitos, 10, t0 - 8 * MIN) === null, 'no repite el de 10');
  check(cuadro.hitoQueToca(t0, hitos, 10, t0 - 4 * MIN) === 5, 'avisa el de 5 cuando vence');
  check(cuadro.hitoQueToca(t0, hitos, null, t0 - 3 * MIN) === 5, 'elige el hito MÁS CHICO ya vencido');
  check(cuadro.hitoQueToca(t0, hitos, null, t0 + MIN) === null, 'ya arrancó: manda el llamado a la mesa');
  check(/7:00 pm$/.test(cuadro.horaEnZona(new Date(t0))), `sale en Caracas (${cuadro.horaEnZona(new Date(t0))})`);
}

seccion('La configuración del Relámpago (config.ts)');
{
  const d = relampago.normalizarRelampago(null);
  check(d.on === false && d.modo === 'gloria' && d.puntos === 24 && d.cuadroMinimo === 16, 'nace APAGADO, de gloria, a 24 y con cuadro mínimo de 16');
  check(relampago.normalizarRelampago({ on: 'true' }).on === false, 'ante la duda queda apagado');
  check(relampago.normalizarRelampago({ cadaMinutos: 45 }).cadaMinutos === 45 && relampago.normalizarRelampago({ cadaMinutos: 7 }).cadaMinutos === 30, '«cada 45» vale (divide el día); cada 7 cae al default');
  check(relampago.normalizarRelampago({ puntos: 33 }).puntos === 24 && relampago.normalizarRelampago({ puntos: 100 }).puntos === 100, 'los puntos solo de los de la casa');
  const cfg = relampago.normalizarRelampago({ desdeHora: 18, hastaHora: 23, cadaMinutos: 30 });
  const dia = Date.parse('2026-09-26T04:30:00Z'); // 00:30 del 26 en Caracas
  const f = relampago.franjasEntre(cfg, new Date(dia), new Date(dia + 23 * 3600_000));
  check(f.length === 11, `de 6 a 11 cada media hora son once franjas (${f.length})`);
  check(relampago.nombreDeFranja(f[0]).startsWith('El Relámpago 6:00') && /11:00/.test(relampago.nombreDeFranja(f[10])), `la primera a las 6 y la última a las 11 de Caracas (${relampago.nombreDeFranja(f[0])})`);
  const cfg45 = relampago.normalizarRelampago({ desdeHora: 13, desdeMinuto: 15, hastaHora: 23, cadaMinutos: 45 });
  const f45 = relampago.franjasEntre(cfg45, new Date(dia), new Date(dia + 24 * 3600_000));
  check(/1:15/.test(relampago.nombreDeFranja(f45[0])) && /2:00/.test(relampago.nombreDeFranja(f45[1])), 'desde la 1:15 cada 45: 1:15, 2:00…');
  const temporada = relampago.normalizarRelampago({ desdeFecha: '2026-09-28' });
  check(relampago.franjasEntre(temporada, new Date(dia), new Date(dia + 24 * 3600_000)).length === 0, 'fuera de la temporada no hay una sola franja');
  check(relampago.franjasEntre(cfg, new Date(dia), new Date(dia + 48 * 3600_000)).length === 22, 'con la ventana en horas cruza la medianoche y trae la noche siguiente');
  check(relampago.normalizarRelampago({ desdeFecha: '2026-10-05', hastaFecha: '2026-10-01' }).hastaFecha === null, 'una temporada al revés se descarta');
}

// ================================================================ la grilla
seccion('La grilla publica por horas (grid.ts)');
{
  await limpiar();
  const ahora = Date.parse('2026-09-26T21:00:00Z'); // 5:00 pm en Caracas
  let r = await torneos.publicarRelampagos(ahora);
  check(r.publicados === 0, 'apagada no publica NADA');
  await relampago.setRelampago({ on: true, prendidoPor: 'socio', desdeHora: 18, hastaHora: 23, cadaMinutos: 30, anticipacionHoras: 2 });
  r = await torneos.publicarRelampagos(ahora);
  check(r.publicados === 3, `prendida publica las franjas que entran en la anticipación: 6:00, 6:30 y 7:00 (${r.publicados})`);
  const lista = await Torneo.conEstado(['registration']);
  check(lista.every((t) => t.tipo === 'relampago' && t.puntos === 24 && t.cuadroMinimo === 16 && t.relleno), 'a 24, con relleno y cuadro mínimo de 16');
  check(lista.every((t) => t.premios.join() === '100,50,25'), 'con los puntos por puesto de las perillas (100/50/25)');
  r = await torneos.publicarRelampagos(ahora);
  check(r.publicados === 0 && r.yaEstaban === 3, 'correrla dos veces no duplica la franja');
  await query('UPDATE copa_torneos SET empieza_en = empieza_en + ? WHERE nombre LIKE ?', [15 * MIN, '%6:30%']);
  r = await torneos.publicarRelampagos(ahora);
  check(r.publicados === 0, 'posponer uno no hace que se publique otro con el mismo nombre');
  r = await torneos.publicarRelampagos(Date.parse('2026-09-27T03:40:00Z')); // 11:40 pm
  check(r.publicados === 0, 'fuera del horario de la noche no publica nada');
  await relampago.setRelampago({ anticipacionHoras: 48 });
  r = await torneos.publicarRelampagos(ahora);
  check(r.publicados > 11, `con anticipación de días publica las noches que vienen (${r.publicados})`);
  await limpiar();
  await relampago.setRelampago({ on: true, prendidoPor: 'socio', desdeFecha: '2026-09-28', anticipacionHoras: 24 });
  r = await torneos.publicarRelampagos(ahora);
  check(r.publicados === 0, 'fuera de la temporada no publica aunque esté prendida');
  await relampago.setRelampago({ on: true, prendidoPor: null, desdeFecha: null });
  r = await torneos.publicarRelampagos(ahora);
  check(r.publicados === 0, 'prendida sin saber quién la prendió, no publica');
  await limpiar();
}

// ================================================================ anotarse
seccion('Anotarse, uno a la vez y el overbooking');
{
  await limpiar();
  const yo = await cuenta('Anota');
  const r7 = await Torneo.crear({ nombre: 'El Relámpago 7:00 p. m.', tipo: 'relampago', empiezaEn: Date.now() + 60 * MIN, puntos: 24, cupo: 2, relleno: true, premios: [100, 50, 25] });
  const r8 = await Torneo.crear({ nombre: 'El Relámpago 8:00 p. m.', tipo: 'relampago', empiezaEn: Date.now() + 120 * MIN, puntos: 24, cupo: 2, relleno: true, premios: [100, 50, 25] });
  const normal = await Torneo.crear({ nombre: 'Copa del sábado', tipo: 'normal', empiezaEn: Date.now() + 90 * MIN, puntos: 100, cupo: 2 });
  check((await torneos.inscribirse(r7, yo)).ok, 'se anota en el de las 7');
  check((await torneos.inscribirse(r7, yo)).yaEstaba, 'anotarse dos veces no hace nada');
  const rebote = await torneos.inscribirse(r8, yo);
  check(rebote.status === 409 && rebote.code === 'relampago_pendiente' && /de las 7:00/.test(rebote.error), `el de las 8 rebota con el motivo («${rebote.error}»)`);
  check((await torneos.inscribirse(normal, yo)).ok, 'un torneo normal sí deja');
  await torneos.borrarse(r7, yo.id);
  check((await torneos.inscribirse(r8, yo)).ok, 'se sale del de las 7 → queda libre para el de las 8');
  // En juego: vivo rebota, eliminado queda libre.
  await torneos.borrarse(r8, yo.id);
  await torneos.inscribirse(r7, yo);
  await Torneo.cambiarEstado(r7, 'registration', 'live');
  const cr = await Torneo.crearCruce({ torneoId: r7, ronda: 1, slot: 0, a: String(yo.id), b: 'bot-copa-tigre', estado: 'playing' });
  check((await torneos.inscribirse(r8, yo)).code === 'relampago_pendiente', 'el de las 7 en juego y sigo vivo → el de las 8 rebota');
  await Torneo.actualizarCruce(cr, { ganador: 'bot-copa-tigre', estado: 'completed' });
  check((await torneos.inscribirse(r8, yo)).ok, 'eliminado en el de las 7 → libre para el de las 8');
  // Overbooking: el Relámpago admite hasta el tope aunque el cupo sea 2.
  const otros = [await cuenta('Over'), await cuenta('Over'), invitado('Overina')];
  check((await Promise.all(otros.map((o) => torneos.inscribirse(r8, o)))).every((x) => x.ok), 'el Relámpago de cupo 2 admite más anotados (overbooking hasta el tope)');
  check((await torneos.inscribirse(normal, otros[0])).ok && (await torneos.inscribirse(normal, otros[1])).code === 'lleno', 'el torneo normal respeta su cupo');
  const cerrado = await Torneo.crear({ nombre: 'Ya pasó', tipo: 'normal', empiezaEn: Date.now() - MIN, puntos: 100, cupo: 8 });
  check((await torneos.inscribirse(cerrado, otros[2])).code === 'cerrada', 'con la hora pasada la inscripción ya cerró');
  const cuenta1 = (await vitrina.vitrina(String(yo.id))).torneos.find((t) => t.id === r8);
  check(cuenta1?.anotado === true && cuenta1.inscritos === 4, 'la vitrina dice que estoy anotado y cuántos van');
}

// ================================================================ los presentes
seccion('Se arma con los que están (presentes.ts)');
{
  await limpiar();
  await Config.guardar('torneos.ventanaMs', 60000);
  const gente = [await cuenta('Pres'), await cuenta('Pres'), await cuenta('Pres'), await cuenta('Pres'), invitado('Tarde'), invitado('Tarda')];
  let id = await torneoNormal({ gente, tipo: 'relampago', nombre: 'El Relámpago 9:00 p. m.', cupo: 16, relleno: true });
  await vencer(id, 5000); // dentro de la ventana
  gente.slice(0, 4).forEach((g) => online.add(String(g.id)));
  await arrancar();
  let t = await Torneo.porId(id);
  check(t.estado === 'registration' && (await Torneo.cruces(id)).length === 0, 'a la hora abre la ventana y NO arma el cuadro hasta que cierra');
  check(eventos('tournament:armando').length === 6 && eventos('tournament:updated').some((e) => e.d.status === 'armando'), 'avisa «siéntate ya» a los seis anotados');
  await arrancar();
  check(eventos('tournament:armando').length === 6, 'el aviso de la ventana sale una sola vez');
  await vencer(id, 120_000); // la ventana ya cerró
  await arrancar();
  t = await Torneo.porId(id);
  const cs = await Torneo.cruces(id);
  const enCuadro = new Set(cs.flatMap((c) => [c.a, c.b]).filter(Boolean));
  check(t.estado === 'live', 'al cerrar, el torneo arranca');
  check(gente.slice(0, 4).every((g) => enCuadro.has(String(g.id))) && !enCuadro.has(gente[4].id) && !enCuadro.has(gente[5].id), 'el cuadro se arma SOLO con los conectados');
  const regs = await Torneo.inscritos(id);
  check(regs.filter((r) => r.estado === 'ausente').length === 2, 'los que no llegaron quedan «ausente» (no se borran)');
  check(eventos('tournament:llegaste_tarde').length === 2 && eventos('tournament:llegaste_tarde')[0].d.motivo === 'ausente', 'y reciben «Llegaste tarde»');
  check(regs.filter((r) => r.esBot).length === 12, `el relleno completa el cuadro de 16 con la casa (${regs.filter((r) => r.esBot).length} bots)`);

  await limpiar();
  const tres = [await cuenta('Cupo'), await cuenta('Cupo'), await cuenta('Cupo')];
  id = await torneoNormal({ gente: tres, tipo: 'relampago', nombre: 'El Relámpago 9:30 p. m.', cupo: 2 });
  for (let i = 0; i < 3; i++) await query('UPDATE copa_inscritos SET inscrito_en = ? WHERE user_id = ?', [Date.now() - (10 - i) * MIN, String(tres[i].id)]);
  tres.forEach((g) => online.add(String(g.id)));
  await vencer(id, 120_000);
  await arrancar();
  const r3 = await Torneo.inscritos(id);
  check(r3.find((r) => r.userId === String(tres[2].id)).estado === 'sin_cupo' && r3.find((r) => r.userId === String(tres[0].id)).estado === 'registered', 'overbooking: entran los primeros en anotarse; el resto queda «sin_cupo»');

  await limpiar();
  const dos = [await cuenta('Seg'), await cuenta('Seg')];
  id = await torneoNormal({ gente: dos, tipo: 'relampago', nombre: 'El Relámpago 10:00 p. m.', cupo: 8 });
  online.add(String(dos[0].id));
  await vencer(id, 120_000);
  await arrancar();
  t = await Torneo.porId(id);
  check(t.estado === 'registration' && t.segundaHasta != null && eventos('tournament:armando').some((e) => e.d.segunda), 'pocos presentes al cerrar → UNA segunda ventana antes de cancelar');
  online.add(String(dos[1].id));
  await query('UPDATE copa_torneos SET segunda_hasta = ? WHERE id = ?', [Date.now() - 1000, id]);
  await arrancar();
  t = await Torneo.porId(id);
  const cs2 = await Torneo.cruces(id);
  check(t.estado === 'live' && new Set(cs2.flatMap((c) => [c.a, c.b])).has(String(dos[1].id)), 'el que llegó en la segunda ventana entra al cuadro');

  await limpiar();
  await Config.guardar('torneos.armarConLosQueEstan', false);
  const cuatro = [await cuenta('Off'), await cuenta('Off'), await cuenta('Off'), await cuenta('Off')];
  id = await torneoNormal({ gente: cuatro, tipo: 'relampago', nombre: 'El Relámpago 10:30 p. m.', cupo: 8, relleno: false });
  await vencer(id, 120_000);
  await arrancar();
  check((await Torneo.porId(id)).estado === 'live' && (await Torneo.inscritos(id)).every((r) => r.estado === 'registered'), 'con la perilla apagada entran todos los anotados');
  await Config.guardar('torneos.armarConLosQueEstan', true);

  await limpiar();
  const solo = [await cuenta('Solo')];
  id = await torneoNormal({ gente: solo, nombre: 'Copa sin gente', relleno: false });
  await vencer(id);
  await arrancar();
  check((await Torneo.porId(id)).estado === 'cancelled', 'sin relleno y con menos del mínimo, el torneo se cancela');
}

// ================================================================ la puerta
seccion('La puerta abierta (puertaAbierta.ts)');
{
  await limpiar();
  const gente = [];
  for (let i = 0; i < 5; i++) gente.push(await cuenta('Puerta'));
  const tarde1 = await cuenta('Tarde');
  const tarde2 = await cuenta('Tarde');
  const id = await torneoNormal({ gente: [...gente, tarde1, tarde2], tipo: 'relampago', nombre: 'El Relámpago 11:00 p. m.', relleno: false, cupo: 16 });
  gente.forEach((g) => online.add(String(g.id)));
  await vencer(id, 90_000); // ventana cerrada, puerta abierta (60 s + 180 s)
  await arrancar();
  const antes = await Torneo.cruces(id);
  check(antes.filter((c) => c.ronda === 1).length === 1, 'cinco presentes: una previa, tres directos');
  const r1 = await torneos.entrarPorLaPuerta(id, String(tarde1.id), Date.now(), () => 0);
  const despues = await Torneo.cruces(id);
  const nueva = despues.find((c) => c.id === r1.cruceId);
  check(r1.ok && nueva?.ronda === 1 && nueva.b === String(tarde1.id) && nueva.a === r1.rivalUserId, 'el ausente entra contra un directo y juega YA');
  check(Boolean(await mesaDe(r1.cruceId)), 'y su mesa sale en el acto');
  const r2 = await torneos.entrarPorLaPuerta(id, String(tarde2.id), Date.now(), () => 0);
  check(!r2.ok && r2.codigo === 'sin_hueco', 'el segundo ya no encuentra puesto');
  check((await torneos.entrarPorLaPuerta(id, String(tarde1.id))).codigo === 'ya_estas', 'el que ya está en el cuadro no entra dos veces');
  check((await torneos.entrarPorLaPuerta(id, String(tarde2.id), Date.now() + 10 * MIN)).codigo === 'cerrada', 'pasado el plazo la puerta está cerrada');
  await Config.guardar('torneos.puertaAbiertaMs', 0);
  check((await torneos.entrarPorLaPuerta(id, String(tarde2.id))).codigo === 'no_aplica', 'con la perilla en 0 no hay puerta');
  await Config.guardar('torneos.puertaAbiertaMs', 180000);
  const det = await vitrina.detalle(id, String(tarde2.id));
  check(det.me.registrationStatus === 'ausente' && det.me.puertaHasta != null, 'el detalle le dice al ausente hasta cuándo puede «Entrar ahora»');
}

// ================================================================ presencia
seccion('VOY / NO VOY, el walkover y la segunda llamada (presencia.ts)');
{
  await limpiar();
  const [a, b, c, d] = [await cuenta('Voy'), await cuenta('Voy'), await cuenta('Voy'), await cuenta('Voy')];
  const id = await torneoNormal({ gente: [a, b, c, d], relleno: false, premios: [100, 50, 0] });
  await vencer(id);
  await arrancar();
  let cs = (await Torneo.cruces(id)).filter((x) => x.ronda === 1);
  check(cs.length === 2 && cs.every((x) => x.estado === 'playing' && x.plazoEn > Date.now()), 'arranca con dos mesas y su plazo de presentación');
  check(eventos('tournament:table_ready').length === 4 && eventos('tournament:table_ready')[0].d.llamado?.title === 'Quedan cuatro', 'a los cuatro les llega el llamado («Quedan cuatro»)');
  const [c1, c2] = cs;
  // VOY: queda escrito y corre 3 minutos, una sola vez.
  const v1 = await torneos.decirQueVoy(id, c1.a);
  check(v1.ok && v1.prorrogaMinutos === 3 && Date.parse(v1.deadlineAt) - c1.plazoEn === 3 * MIN, 'VOY deja la marca escrita y corre el plazo 3 minutos');
  const v2 = await torneos.decirQueVoy(id, c1.b);
  check(v2.ok && v2.prorrogaMinutos === 0, 'la prórroga es UNA sola vez por cruce, aunque toquen los dos');
  check((await torneos.decirQueVoy(id, 'guest-nadie123')).status === 404, 'no deja decir que vas a un cruce que no es tuyo');
  // Los dos dijeron voy y no arrancó: segunda llamada.
  await Torneo.actualizarCruce(c1.id, { plazoEn: Date.now() - 1000 });
  await torneos.conCandado(() => torneos.barrerPlazos());
  let x = await Torneo.cruce(c1.id);
  check(x.ganador == null && x.segundaLlamada && x.plazoEn > Date.now(), 'los DOS presentes y no arrancó: SEGUNDA LLAMADA, no pase');
  check(eventos('tournament:table_ready').some((e) => e.d.segundaLlamada), 'y a los dos les llega «¡Segunda llamada!»');
  await Torneo.actualizarCruce(c1.id, { plazoEn: Date.now() - 1000 });
  await torneos.conCandado(() => torneos.barrerPlazos());
  x = await Torneo.cruce(c1.id);
  const regs = await Torneo.inscritos(id);
  const mejor = [x.a, x.b].sort((p, q) => regs.find((r) => r.userId === p).siembra - regs.find((r) => r.userId === q).siembra)[0];
  check(x.ganador === mejor && x.motivo === 'no_show', 'vencida la segunda llamada decide la siembra, no el orden de los botones');
  // En el otro cruce solo entra B: al vencer el plazo, pasa B aunque sea peor sembrado.
  const m2 = await mesaDe(c2.id);
  await entrar(m2.code, c2.b);
  check(!rm.rooms.get(m2.code).started, 'con uno solo sentado la mesa no arranca');
  check((await Torneo.cruce(c2.id)).presenteB != null, 'entrar a la mesa ES presentarse y queda escrito');
  await Torneo.actualizarCruce(c2.id, { plazoEn: Date.now() - 1000 });
  await torneos.conCandado(() => torneos.barrerPlazos());
  x = await Torneo.cruce(c2.id);
  check(x.ganador === c2.b, 'el que se presentó pasa por walkover');
  check(!rm.rooms.has(m2.code) && eventos('tournament:mesa_cerrada').length >= 1, 'la mesa fantasma se cierra y a su gente se le avisa');
  const final = (await Torneo.cruces(id)).find((z) => z.ronda === 2);
  check(final.a && final.b && final.estado === 'playing', 'los dos ganadores quedan en la final, con su mesa');
  // NO VOY: cede y el rival pasa EN EL ACTO.
  const nv = await torneos.decirQueNoVoy(id, final.a);
  check(nv.ok && (await Torneo.cruce(final.id)).ganador === final.b, 'NO VOY: el rival pasa en el acto');
  const t = await Torneo.porId(id);
  check(t.estado === 'completed' && t.campeonId === final.b, 'y como era la final, el torneo termina con su campeón');
}

seccion('El que dijo VOY se lleva el pase aunque el servidor haya reiniciado; el bot nunca falta');
{
  await limpiar();
  const [a, b] = [await cuenta('Rein'), await cuenta('Rein')];
  const id = await torneoNormal({ gente: [a, b], relleno: false, premios: [100, 0, 0] });
  await vencer(id);
  await arrancar();
  const c = (await Torneo.cruces(id))[0];
  await torneos.decirQueVoy(id, c.b);
  // «Reinicio»: las salas en memoria se pierden.
  rm = new RoomManager();
  rm.setIO(io);
  torneos.conectar(io, rm);
  await Torneo.actualizarCruce(c.id, { plazoEn: Date.now() - 1000 });
  await torneos.conCandado(() => torneos.barrerPlazos());
  check((await Torneo.cruce(c.id)).ganador === c.b, 'la marca de VOY vive en la base y decide el pase');

  await limpiar();
  const h = await cuenta('Fant');
  const id2 = await torneoNormal({ gente: [h], relleno: true, cuadroMinimo: 2, premios: [100, 0, 0] });
  await vencer(id2);
  await arrancar();
  const c2 = (await Torneo.cruces(id2))[0];
  check([c2.a, c2.b].some((u) => torneos.esBot(u)), 'con una persona y relleno, juega contra la casa');
  await Torneo.actualizarCruce(c2.id, { plazoEn: Date.now() - 1000 });
  await torneos.conCandado(() => torneos.barrerPlazos());
  check(torneos.esBot((await Torneo.cruce(c2.id)).ganador), 'nadie abrió la mesa → gana el BOT, no el ausente');
}

seccion('Reinicio a mitad de torneo: el reconciliador lo retoma');
{
  await limpiar();
  const gente = [await cuenta('Rec'), await cuenta('Rec'), await cuenta('Rec'), await cuenta('Rec')];
  const id = await torneoNormal({ gente, relleno: false });
  await vencer(id);
  await arrancar();
  const viejas = (await Torneo.mesasDelTorneo(id)).map((m) => m.code);
  rm = new RoomManager();
  rm.setIO(io);
  torneos.conectar(io, rm);
  torneos.__pruebas.arranque = Date.now(); // acaba de arrancar
  await Torneo.actualizarCruce((await Torneo.cruces(id))[0].id, { plazoEn: Date.now() - 5000 });
  await torneos.conCandado(() => torneos.barrerPlazos());
  const empujado = (await Torneo.cruces(id))[0];
  check(empujado.ganador == null && empujado.plazoEn >= Date.now() + 2.9 * MIN, 'recién arrancado NO reparte pases: el plazo se empuja un plazo completo');
  await torneos.conCandado(() => torneos.reconciliar());
  const nuevas = (await Torneo.mesasDelTorneo(id)).filter((m) => m.estado === 'playing');
  check(nuevas.length === 2 && nuevas.every((m) => !viejas.includes(m.code) && rm.rooms.has(m.code)), 'las mesas perdidas se relanzan en salas nuevas');
  check(nuevas.every((m) => rm.rooms.get(m.code).players.length === 2 && rm.rooms.get(m.code).torneo?.mesaId === m.id), 'pre-sentadas con los dos del cruce');
  torneos.__pruebas.arranque = Date.now() - 3600_000;
  // La partida que terminó pero el cuadro no registró (se cayó el aviso): la avanza el reconciliador.
  const m = nuevas[0];
  const room = rm.rooms.get(m.code);
  const cr = await Torneo.cruce(m.cruceId);
  await entrar(m.code, cr.a);
  await entrar(m.code, cr.b);
  check(room.started, 'las dos personas entran y la mesa arranca sola');
  room._registrada = true; // como si el aviso del final se hubiera perdido
  rm.abandonarPartida(m.code, room.players[0].id);
  await flush();
  check((await Torneo.cruce(cr.id)).ganador == null, 'el final se perdió: el cruce sigue abierto');
  await torneos.conCandado(() => torneos.reconciliar());
  check((await Torneo.cruce(cr.id)).ganador === String(room.players[1].id), 'el reconciliador lo registra y el cuadro avanza');
}

seccion('Inactividad en la mesa del torneo (idleForfeitSeconds)');
{
  await limpiar();
  const h = await cuenta('Quieto');
  const id = await torneoNormal({ gente: [h], relleno: true, cuadroMinimo: 2 });
  await vencer(id);
  await arrancar();
  const c = (await Torneo.cruces(id))[0];
  const m = await mesaDe(c.id);
  const room = await entrar(m.code, h.id);
  check(room.started, 'la persona entra y la mesa contra la casa arranca');
  await esperarQue(() => room.game.status !== 'playing' || !room.game.getCurrentPlayer().isBot, 5000);
  const persona = room.players.find((p) => !p.isBot);
  if (room.game.status === 'playing') persona._ultimaPropia = Date.now() - 10 * MIN;
  const n = torneos.barrerQuietos();
  check(n === 1 && room.game.status === 'game-over', 'el que no juega nada propio en 120 s pierde la partida del torneo');
  await esperarQue(async () => (await Torneo.cruce(c.id)).ganador != null, 3000);
  check(torneos.esBot((await Torneo.cruce(c.id)).ganador), 'y el cuadro avanza con el bot');
  const normal = rm.createRoom({ mode: '1v1', hostId: 'guest-normal123', hostUsername: 'Normal' });
  rm.joinRoom(normal.code, { userId: 'guest-normal456', username: 'Otro', socketId: null });
  rm.startGame(normal.code);
  normal.players.forEach((p) => { p._ultimaPropia = Date.now() - 10 * MIN; });
  check(torneos.barrerQuietos() === 0 && normal.game.status === 'playing', 'una mesa que NO es de torneo jamás pierde por inactividad (ahí la mesa juega por ti)');
  rm.rooms.delete(normal.code);
}

seccion('Recordatorios antes del torneo');
{
  await limpiar();
  const [a, b] = [await cuenta('Rec'), invitado('Recuerda')];
  const id = await torneoNormal({ gente: [a, b], relleno: true });
  await Torneo.inscribir(id, { userId: 'bot-copa-tigre', username: 'El Tigre', esBot: true });
  const empieza = Date.now() + 9 * MIN;
  await query('UPDATE copa_torneos SET empieza_en = ? WHERE id = ?', [empieza, id]);
  await torneos.conCandado(() => torneos.avisarProximos(Date.now()));
  let rec = eventos('tournament:recordatorio');
  check(rec.length === 2 && rec.every((e) => e.d.hito === 10) && /Somos 2 anotados/.test(rec[0].d.body), 'avisa el de 10 a las dos personas («Somos 2 anotados»)');
  check(!rec.some((e) => e.para === 'user:bot-copa-tigre'), 'no le escribe a los bots');
  await torneos.conCandado(() => torneos.avisarProximos(Date.now() + MIN));
  check(eventos('tournament:recordatorio').length === 2, 'no lo repite en los ticks que siguen');
  await torneos.conCandado(() => torneos.avisarProximos(empieza - 4 * MIN));
  rec = eventos('tournament:recordatorio');
  check(rec.length === 4 && rec[3].d.hito === 5 && rec[3].d.title === 'Cinco minutos', 'avisa el de 5, que apura');
}

// ================================================================ el torneo entero, a mano
seccion('Un torneo de 4 decidido a mano: tercer puesto a la vez que la final, puestos y premios');
{
  await limpiar();
  const gente = [await cuenta('Podio'), await cuenta('Podio'), await cuenta('Podio'), await cuenta('Podio')];
  const id = await torneoNormal({ gente, relleno: false, premios: [100, 50, 25] });
  await vencer(id);
  await arrancar();
  let cs = await Torneo.cruces(id);
  const tercer = cs.find((c) => c.slot === 1 && c.ronda === 2);
  check(Boolean(tercer) && tercer.a == null && tercer.b == null && tercer.estado === 'pending', 'nace el cruce por el 3.º, vacío, al lado de la final');
  const [s0, s1] = cs.filter((c) => c.ronda === 1).sort((p, q) => p.slot - q.slot);
  // Semi 0: la juegan de verdad y el lado A abandona.
  const m0 = await mesaDe(s0.id);
  await entrar(m0.code, s0.a);
  await entrar(m0.code, s0.b);
  const sala0 = rm.rooms.get(m0.code);
  check(sala0.started, 'las dos personas entran y la semifinal arranca sola');
  rm.abandonarPartida(m0.code, sala0.players.find((p) => String(p.id) === s0.a).id);
  await esperarQue(async () => (await Torneo.cruce(s0.id)).ganador != null, 3000);
  check((await Torneo.cruce(s0.id)).ganador === s0.b && (await Torneo.cruce(s0.id)).motivo === 'partida', 'la semi 0 la gana el que se quedó (partida)');
  cs = await Torneo.cruces(id);
  check(cs.find((c) => c.id === tercer.id).a === s0.a && cs.find((c) => c.id === tercer.id).estado === 'pending', 'el perdedor de la semi 0 baja al 3.º por el lado A y espera');
  await torneos.decirQueNoVoy(id, s1.a);
  cs = await Torneo.cruces(id);
  const fin = cs.find((c) => c.ronda === 2 && c.slot === 0);
  const ter = cs.find((c) => c.id === tercer.id);
  check(fin.a === s0.b && fin.b === s1.b && ter.b === s1.a, 'los ganadores a la final y el perdedor de la semi 1 al 3.º por el lado B');
  const mf = await mesaDe(fin.id);
  const mt = await mesaDe(ter.id);
  check(Boolean(mf && mt) && Math.abs(mf.creadaEn - mt.creadaEn) < 2000, 'el 3.º se juega AL MISMO TIEMPO que la final');
  // La final la gana B por abandono; el 3.º se decide por no presentarse.
  await entrar(mf.code, fin.a);
  await entrar(mf.code, fin.b);
  const salaF = rm.rooms.get(mf.code);
  rm.abandonarPartida(mf.code, salaF.players.find((p) => String(p.id) === fin.a).id);
  await esperarQue(async () => (await Torneo.cruce(fin.id)).ganador != null, 3000);
  check((await Torneo.porId(id)).estado === 'live', 'con la final cerrada y el 3.º abierto, el torneo NO termina');
  await entrar(mt.code, ter.b);
  await Torneo.actualizarCruce(ter.id, { plazoEn: Date.now() - 1000 });
  bandeja.length = 0;
  await torneos.conCandado(() => torneos.barrerPlazos());
  const t = await Torneo.porId(id);
  check(t.estado === 'completed' && t.campeonId === fin.b, 'termina cuando cierran los dos; campeón = el que ganó la final');
  const regs = await Torneo.inscritos(id);
  const puesto = (u) => regs.find((r) => r.userId === u)?.puesto;
  check(puesto(fin.b) === 1 && puesto(fin.a) === 2 && puesto(ter.b) === 3 && puesto(ter.a) === 4, 'puestos: 1.º y 2.º de la final, 3.º y 4.º del partido por el tercero');
  const cambios = eventos('ranking:cambio');
  const cambioDe = (u) => cambios.find((e) => e.para === `user:${u}`)?.d.cambio;
  check(cambioDe(fin.b) === 100 && cambioDe(fin.a) === 50 && cambioDe(ter.b) === 25 && cambioDe(ter.a) == null, 'los puntos de clasificación: 100 / 50 / 25, y nada al 4.º');
  const podium = eventos('tournament:podium');
  check(podium.length === 1 && podium[0].d.podio.map((p) => p.puesto).join() === '1,2,3', 'sale tournament:podium con los tres del podio');
  await torneos.conCandado(() => torneos.reconciliar());
  check(eventos('tournament:podium').length === 1, 'el reconciliador no vuelve a premiar (una sola vez)');
  const pal = await vitrina.palmares();
  check(pal.items[0]?.id === id && pal.items[0].podio.length === 3 && pal.items[0].campeon.userId === fin.b, 'el palmarés lo muestra con su podio');
  const tit = await vitrina.misTitulos(fin.b);
  check(tit.items.length === 1 && tit.items[0].id === id, 'y aparece en «mis títulos» del campeón');
  const copas = await Torneo.tablaDeCopas(10);
  check(copas.some((f) => String(f.userId) === fin.b && f.copas === 1), 'y en la tabla de copas (vista Torneos de la clasificación)');
  check((await Torneo.copasDe(fin.b)) === 1, 'copasDe cuenta su copa');
}

// ================================================================ el Relampago entero
seccion('Un Relámpago de 16 con la casa, jugado ENTERO de punta a punta');
{
  await limpiar();
  await Config.guardar('torneos.ventanaMs', 0);
  const persona = await cuenta('Relampago');
  const guest = invitado('Relampaguita');
  await relampago.setRelampago({ on: true, prendidoPor: 'socio', desdeHora: 0, desdeMinuto: 0, hastaHora: 23, hastaMinuto: 30, cadaMinutos: 30, anticipacionHoras: 1 });
  const pub = await torneos.conCandado(() => torneos.publicarRelampagos());
  const serie = await Torneo.conEstado(['registration']);
  check(pub.publicados >= 1 && serie.every((t) => t.tipo === 'relampago'), `la grilla prendida publica el Relámpago que viene (${serie[0]?.nombre})`);
  const id = serie[0].id;
  check((await torneos.inscribirse(id, persona)).ok && (await torneos.inscribirse(id, guest)).ok, 'se anotan una cuenta y un invitado');
  online.add(String(persona.id));
  online.add(guest.id);
  await vencer(id, 30_000);
  const t0 = Date.now();
  await torneos.tick();
  const t = await Torneo.porId(id);
  const cs = await Torneo.cruces(id);
  const regs = await Torneo.inscritos(id);
  check(t.estado === 'live' && regs.length === 16 && regs.filter((r) => r.esBot).length === 14, 'arranca con cuadro de 16: dos personas y 14 de la casa');
  check(new Set(regs.map((r) => r.siembra)).size === 16, 'siembras 1..16 sin repetir');
  check(cs.length === 16 && Math.max(...cs.map((c) => c.ronda)) === 4, '4 rondas, 15 cruces y el del tercer puesto');
  check((await Torneo.mesasDelTorneo(id)).length === 8, 'la ronda 1 lanza sus 8 mesas de una vez');
  // Mirar: el anotado cualquier mesa; el de afuera solo semifinal y final.
  const unaMesa = rm.rooms.get((await Torneo.mesasDelTorneo(id))[0].code);
  check(await torneos.puedeMirar(guest.id, unaMesa), 'el anotado puede mirar cualquier partida del torneo');
  check(!(await torneos.puedeMirar('guest-mirona999', unaMesa)), 'el de afuera NO puede mirar la ronda 1');
  // Las personas juegan su mesa como si tocaran la pantalla.
  const mias = new Set([String(persona.id), guest.id]);
  let corriendo = true;
  let miradas = 0;
  let semiMirada = false;
  const robot = (async () => {
    while (corriendo) {
      for (const room of [...rm.rooms.values()]) {
        if (!room.torneo || room.torneo.torneoId !== id) continue;
        if (!room.started) {
          for (const p of room.players) if (!p.isBot && mias.has(String(p.id)) && !p.socketId) await entrar(room.code, p.id);
          continue;
        }
        if (room.torneo?.ronda === 3 && !semiMirada) {
          semiMirada = await torneos.puedeMirar('guest-mirona999', room);
          const v = rm.vistaDeEspectador(room);
          if (v && v.vista.hand.length === 0 && v.mesa.myHand.length === 0 && !('hands' in v.vista)) miradas += 1;
        }
        if (room.game?.status !== 'playing') continue;
        const cur = room.game.getCurrentPlayer();
        if (cur && !cur.isBot && mias.has(String(cur.id))) jugarPor(room, cur.id);
      }
      await esperar(2);
    }
  })();
  const termino = await esperarQue(async () => (await Torneo.porId(id)).estado === 'completed', 120000, 50);
  corriendo = false;
  await robot;
  const seg = ((Date.now() - t0) / 1000).toFixed(1);
  check(termino, `el Relámpago termina solo (${seg} s con los bots a toda velocidad)`);
  const fin = await Torneo.porId(id);
  const cf = await Torneo.cruces(id);
  const rf = await Torneo.inscritos(id);
  check(cf.every((c) => c.ganador != null && c.estado === 'completed'), 'todos los cruces cerrados, ninguno trancado');
  check(cf.filter((c) => c.motivo === 'partida').length === 16, 'los 16 cruces se decidieron JUGANDO (bot contra bot también): ningún walkover');
  const final = cf.find((c) => c.ronda === 4 && c.slot === 0);
  const ter = cf.find((c) => c.ronda === 4 && c.slot === 1);
  check(fin.campeonId === final.ganador, 'el campeón es el que ganó la final');
  const pu = (u) => rf.find((r) => r.userId === u)?.puesto;
  check(pu(final.ganador) === 1 && pu(final.ganador === final.a ? final.b : final.a) === 2 && pu(ter.ganador) === 3, 'podio: final y partido por el tercero');
  check(rf.every((r) => r.puesto != null) && new Set(rf.map((r) => r.puesto)).size === 16, 'los 16 tienen su puesto, sin repetir');
  const mesas = await Torneo.mesasDelTorneo(id);
  check(mesas.every((m) => m.estado === 'completed' && m.ganador) && mesas.some((m) => (m.marcadorA ?? 0) >= 24 || (m.marcadorB ?? 0) >= 24), 'cada mesa guardó su ganador y su marcador (a 24)');
  const { rows: filas } = await query(`SELECT COUNT(*) AS n FROM partidas WHERE room_code IN (${mesas.map(() => '?').join(',')})`, mesas.map((m) => m.code));
  const entrePersonas = cf.filter((c) => mias.has(c.a) && mias.has(c.b)).length;
  check(Number(filas[0].n) === entrePersonas, 'las partidas contra la casa NO ensucian el historial ni la clasificación');
  check(semiMirada && miradas > 0, 'la semifinal se abre al público y el espectador nunca ve una mano');
  const puestoPersona = pu(String(persona.id));
  const cambio = eventos('ranking:cambio').find((e) => e.para === `user:${persona.id}`)?.d.cambio ?? 0;
  const esperado = puestoPersona <= 3 ? [100, 50, 25][puestoPersona - 1] : 0;
  check(cambio === esperado, `la cuenta quedó ${puestoPersona}.º y cobró ${cambio} puntos (esperado ${esperado})`);
  check(eventos('tournament:podium').some((e) => e.d.tournamentId === id), 'sale tournament:podium');
  const det = await vitrina.detalle(id, String(persona.id));
  check(det.cuadro.length === 16 && det.podio.length === 3 && det.torneo.campeon?.userId === fin.campeonId, 'el detalle trae el cuadro, el podio y el campeón');
  const rooms = [...rm.rooms.values()].filter((r) => r.torneo?.torneoId === id);
  check(rooms.every((r) => r.game?.status === 'game-over'), 'no queda ninguna mesa colgada en memoria');
}

seccion('El cuarto del socio');
{
  await limpiar();
  check((await torneos.crearTorneo({ nombre: 'X', empiezaEn: Date.now() + MIN })).status === 400, 'rechaza un nombre sin letras');
  check((await torneos.crearTorneo({ nombre: 'Copa', empiezaEn: Date.now() - MIN })).status === 400, 'rechaza la hora en el pasado');
  check((await torneos.crearTorneo({ nombre: 'Copa', empiezaEn: Date.now() + MIN, puntos: 33 })).status === 400, 'los puntos solo de 24/50/100/150/200');
  const r = await torneos.crearTorneo({ nombre: 'Copa del sábado', empiezaEn: new Date(Date.now() + 60 * MIN).toISOString(), cupo: 8, relleno: false });
  check(r.ok && r.torneo.puntos === 100 && r.torneo.tipo === 'normal' && r.torneo.premios.join() === '100,50,25', 'crea uno «como tal»: a 100 por defecto, premios 100/50/25');
  const f = await torneos.rellenarConBots(r.torneo.id, 3);
  check(f.ok && f.agregados === 3, 'rellena con la casa');
  const p = await torneos.posponer(r.torneo.id, 15);
  check(p.ok && Date.parse(p.startAt) >= Date.now() + 74 * MIN, 'pospone la hora');
  const c = await torneos.cancelarTorneo(r.torneo.id);
  check(c.ok && c.torneo.estado === 'cancelled' && (await torneos.cancelarTorneo(r.torneo.id)).ok, 'cancela (idempotente)');
  const cfg = await torneos.guardarRelampago({ on: true, desdeHora: 19, premios: { campeon: 200 } });
  check(cfg.on && cfg.prendidoPor === 'socio' && cfg.desdeHora === 19 && cfg.premios.campeon === 200 && cfg.modo === 'gloria', 'prende la grilla y mueve los puntos del campeón desde su cuarto');
  await torneos.guardarRelampago({ on: false, premios: { campeon: 100 } });
}

torneos.apagar();
await esperar(50);
console.log('');
console.log('========================================');
console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
process.exitCode = fallados > 0 ? 1 : 0;
