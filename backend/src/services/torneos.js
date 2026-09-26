import crypto from 'node:crypto';
import * as Torneo from '../models/Torneo.js';
import * as Config from '../models/Config.js';
import * as Ranking from '../models/Ranking.js';
import * as Notificacion from '../models/Notificacion.js';
import { TIPO } from '../models/Notificacion.js';
import * as pase from './pase.js';
import * as libreta from './libreta.js';
import { BOTS } from '../game/bots.js';
import {
  generarCuadro, nextPow2, tercerPuestoAplica, SLOT_TERCER_PUESTO, rondaFinalDe, esTercerPuesto,
  huecosDePuerta, puestosDelCuadro, cuadroTerminado, elegirGanadorWalkover, llamadoDeTorneo,
  normalizarHitos, hitoQueToca, horaEnZona, mensajeDelHito
} from './torneos/cuadro.js';
import {
  getRelampago, setRelampago, franjasEntre, nombreDeFranja, inicioDelDiaEnCaracas, comoSeLlama,
  RELAMPAGO_TZ, PUNTOS_DE_TORNEO, NIVELES_DE_BOT
} from './torneos/relampago.js';

/**
 * LOS TORNEOS Y EL RELAMPAGO, COPIADOS DEL TRUCO (seccion 211).
 *
 * «Mientras mas nos copiemos del truco, mejor». Esto es el scheduler, el
 * orquestador, la presencia (VOY / NO VOY, segunda llamada), «se arma con los
 * que estan», la puerta abierta, uno-a-la-vez, el partido por el tercero, los
 * recordatorios y la grilla del Relampago del truco
 * (`artifacts/api-server/src/lib/tournaments/*` y `lib/relampago/*`), pasados
 * a JS y SIN PLATA: el premio es la copa y puntos de clasificacion.
 *
 * Reemplaza al motor viejo (que vivia en este mismo archivo): aquel publicaba
 * uno cada media hora las 24 horas sin interruptor, llevaba el reloj de
 * presentarse en memoria y re-emparejaba cada ronda. Este lleva el cuadro
 * entero en la base (`copa_*`), asi que un reinicio a mitad de torneo lo
 * retoma: el reconciliador vuelve a lanzar las mesas perdidas y empuja los
 * plazos (nadie pierde por un reinicio nuestro).
 *
 * UN SOLO PROCESO, UN SOLO CANDADO. El truco usa transacciones con FOR UPDATE;
 * aqui la base es una sola conexion de SQLite o un pool chico de Postgres, y el
 * servidor es una sola maquina. Todo lo que toca el cuadro pasa por
 * `conCandado`, en fila: el fin de una partida, el tick, un «voy», el socio.
 * Asi dos caminos nunca pisan el mismo cruce.
 */

let io = null;
let rm = null;
const latidos = [];

// ------------------------------------------------------------ los bots de la casa

/**
 * Los rivales de relleno: las 12 caras de la casa, y otra vuelta con «II»
 * para llegar a 24, como el pool del truco. Hace falta: el cuadro minimo es
 * de 16 y con una sola persona se necesitan 15 bots.
 */
export const BOTS_DE_TORNEO = [
  ...BOTS.map((b) => ({ id: `bot-copa-${b.id}`, nombre: b.nombre, avatar: b.avatar, difficulty: b.difficulty, frase: b.frase, estrellas: b.estrellas })),
  ...BOTS.map((b) => ({ id: `bot-copa-${b.id}-2`, nombre: `${b.nombre} II`, avatar: b.avatar, difficulty: b.difficulty, frase: b.frase, estrellas: b.estrellas }))
];
const BOT_POR_ID = new Map(BOTS_DE_TORNEO.map((b) => [b.id, b]));
export const esBot = (id) => String(id).startsWith('bot-copa-');
const esCuenta = (id) => /^\d+$/.test(String(id));

// ------------------------------------------------------------ relojes y perillas

/** Para las pruebas: cuando «arranco» el proceso (la gracia tras reinicio mira esto). */
let arranque = Date.now();
const GRACIA_TRAS_REINICIO_MS = Number(process.env.TORNEO_GRACIA_REINICIO_MS ?? 4 * 60_000);
const TICK_MS = 15_000;
const GRILLA_MS = 60_000;
const QUIETOS_MS = 10_000;

const perilla = (clave) => Config.valor(clave);
export const presentacionMs = () => Number(perilla('torneos.presentacionMin')) * 60_000;
export const siguienteManoMs = () => Number(process.env.TORNEO_SIGUIENTE_MANO_MS ?? perilla('torneos.siguienteManoMs'));
const ventanaMs = () => Number(perilla('torneos.ventanaMs'));
const puertaMs = () => Number(perilla('torneos.puertaAbiertaMs'));
const segundaMs = () => Number(perilla('torneos.segundaLlamadaMs'));
const prorrogaMin = () => Number(perilla('torneos.prorrogaMin'));
const premiosDelRelampago = () => [perilla('relampago.premioCampeon'), perilla('relampago.premioSegundo'), perilla('relampago.premioTercero')].map(Number);

/** «Se arma con los que estan» aplica al Relampago (1v1, gratis: aqui todos lo son). */
export const aplicaPresentes = (t) => Boolean(perilla('torneos.armarConLosQueEstan')) && t.tipo === 'relampago';

// ------------------------------------------------------------ el candado

let cola = Promise.resolve();
/** Todo lo que toca el cuadro, en fila. Nunca llamar a conCandado desde adentro de otro. */
export function conCandado(fn) {
  const r = cola.then(() => fn());
  cola = r.catch(() => {});
  return r;
}

// ------------------------------------------------------------ presencia en linea

/** userId -> ultima vez que se lo vio conectado. «Estuvo en la ventana» cuenta, no solo el segundo del cierre. */
const vistos = new Map();
let enLineaDePrueba = null;

export function estaEnLinea(userId) {
  if (enLineaDePrueba) return enLineaDePrueba(String(userId));
  const sala = io?.sockets?.adapter?.rooms?.get(`user:${userId}`);
  return Boolean(sala && sala.size > 0);
}
export function marcarVisto(userId, ms = Date.now()) {
  vistos.set(String(userId), ms);
}
function estuvoEnLineaDesde(userId, desde) {
  return estaEnLinea(userId) || (vistos.get(String(userId)) ?? 0) >= desde;
}
const socketVivo = (sid) => Boolean(sid) && (!io?.sockets?.sockets?.get || Boolean(io.sockets.sockets.get(sid)));

// ------------------------------------------------------------ avisos

const aUsuario = (userId, evento, datos) => io?.to(`user:${userId}`).emit(evento, datos);
const aTodos = (evento, datos) => io?.emit(evento, datos);

/** El buzon solo guarda avisos de cuentas; al invitado le llega en vivo. */
async function alBuzon(userId, { titulo, cuerpo, datos }) {
  if (!esCuenta(userId)) return;
  try {
    const guardado = await Notificacion.crear({ userId, tipo: TIPO.TORNEO, titulo, cuerpo, datos });
    aUsuario(userId, 'notif:nueva', guardado);
    Notificacion.podar(userId).catch(() => {});
  } catch (err) {
    console.error('Torneos: no se pudo dejar el aviso:', err.message);
  }
}

const actualizado = (torneoId, status, extra = {}) => aTodos('tournament:updated', { tournamentId: torneoId, status, ...extra });

// ------------------------------------------------------------ inscribirse

/**
 * UN RELAMPAGO A LA VEZ (unoALaVez.ts, Raul 20-sep): con uno pendiente
 * (inscrito, o en juego y todavia vivo) no se anota en el siguiente. Solo
 * entre Relampagos: un torneo del socio ni cuenta ni bloquea.
 */
export async function relampagoPendienteDe(userId, excepto) {
  const filas = await Torneo.inscripcionesDe(userId, [Torneo.ESTADO.INSCRIPCION, Torneo.ESTADO.JUGANDO]);
  for (const f of filas) {
    if (f.id === Number(excepto) || f.tipo !== 'relampago' || f.miEstado !== Torneo.INSCRIPCION.INSCRITO) continue;
    if (f.estado === Torneo.ESTADO.INSCRIPCION) return f;
    const cs = await Torneo.cruces(f.id);
    const eliminado = cs.some((c) => c.estado === Torneo.CRUCE.TERMINADO && c.ganador && c.ganador !== String(userId) && (c.a === String(userId) || c.b === String(userId)));
    if (!eliminado) return f;
  }
  return null;
}

/** `yo` = { id, nombre, avatar }. Devuelve { ok } o { error, status, code }. */
export function inscribirse(torneoId, yo) {
  return conCandado(async () => {
    const t = await Torneo.porId(torneoId);
    if (!t) return { error: 'Torneo no encontrado', status: 404 };
    if (t.estado !== Torneo.ESTADO.INSCRIPCION) return { error: 'La inscripción no está abierta', status: 400, code: 'cerrada' };
    if (t.empiezaEn <= Date.now()) return { error: 'La inscripción ya cerró', status: 400, code: 'cerrada' };
    const ya = await Torneo.inscripcion(t.id, yo.id);
    if (ya?.estado === Torneo.INSCRIPCION.INSCRITO) return { ok: true, yaEstaba: true };
    if (t.tipo === 'relampago') {
      const pendiente = await relampagoPendienteDe(yo.id, t.id);
      if (pendiente) {
        return { error: `Termina ${comoSeLlama(pendiente.nombre)} primero: cuando ese acabe para ti, te anotas en este.`, status: 409, code: 'relampago_pendiente', pendienteId: pendiente.id };
      }
    }
    const conteo = (await Torneo.conteos([t.id])).get(t.id) ?? { inscritos: 0 };
    // OVERBOOKING (21-sep en el truco): el Relampago admite hasta el tope
    // aunque el cuadro sea menor; a la hora entran los presentes por llegada.
    const tope = aplicaPresentes(t) ? Math.max(t.cupo, Number(perilla('torneos.inscripcionTope'))) : t.cupo;
    if (conteo.inscritos >= tope) return { error: 'El torneo está completo', status: 400, code: 'lleno' };
    if (ya) await Torneo.quitar(t.id, yo.id);
    await Torneo.inscribir(t.id, { userId: yo.id, username: yo.nombre, avatar: yo.avatar ?? null });
    actualizado(t.id, t.estado, { anotados: conteo.inscritos + 1 });
    return { ok: true };
  });
}

export function borrarse(torneoId, userId) {
  return conCandado(async () => {
    const t = await Torneo.porId(torneoId);
    if (!t) return { error: 'Torneo no encontrado', status: 404 };
    if (t.estado !== Torneo.ESTADO.INSCRIPCION) return { error: 'El torneo ya arrancó; no te puedes borrar', status: 400 };
    await Torneo.quitar(t.id, userId);
    actualizado(t.id, t.estado);
    return { ok: true };
  });
}

// ------------------------------------------------------------ la ventana «sientate ya»

/**
 * Si el torneo esta dentro de su ventana, avisa (una vez) y devuelve true
 * para que NO se arme todavia. Si al cerrar llegaron menos del minimo, UNA
 * segunda ventana igual antes de cancelar (presentes.ts + scheduler.ts).
 * La ventana queda escrita en la base: un reinicio no la vuelve a abrir.
 */
async function enVentana(t, ahora) {
  if (!aplicaPresentes(t) || ventanaMs() === 0) return false;
  const hasta = t.segundaHasta ?? (t.empiezaEn + ventanaMs());
  const humanos = (await Torneo.inscritos(t.id)).filter((r) => !r.esBot && r.estado === Torneo.INSCRIPCION.INSCRITO);
  if (ahora >= hasta) {
    if (t.segundaHasta == null) {
      const presentes = humanos.filter((r) => estaEnLinea(r.userId)).length;
      if (presentes < t.minimo) {
        const hasta2 = ahora + ventanaMs();
        await Torneo.actualizarTorneo(t.id, { segundaHasta: hasta2 });
        avisarArmado(t, humanos, hasta2, true);
        return true;
      }
    }
    return false;
  }
  if (!t.ventanaAvisada) {
    await Torneo.actualizarTorneo(t.id, { ventanaAvisada: 1 });
    avisarArmado(t, humanos, hasta, false);
  }
  return true;
}

function avisarArmado(t, humanos, hasta, segunda) {
  const hastaIso = new Date(hasta).toISOString();
  const seg = Math.max(0, Math.round((hasta - Date.now()) / 1000));
  actualizado(t.id, 'armando', { hasta: hastaIso, parejas: false, segunda });
  for (const h of humanos) {
    aUsuario(h.userId, 'tournament:armando', { tournamentId: t.id, hasta: hastaIso, parejas: false, segunda });
    alBuzon(h.userId, {
      titulo: segunda ? 'Falta gente: último llamado' : 'Arranca el Relámpago: siéntate ya',
      cuerpo: `Abre la app ya: en ${seg} s el cuadro se arma SOLO con los que estén conectados. El que no está, no entra.`,
      datos: { torneoId: t.id }
    });
  }
}

// ------------------------------------------------------------ armar el cuadro

/**
 * Arma el cuadro de un torneo vencido y lo pone 'live' (buildBracketAndStart
 * del truco): los presentes, el relleno con la casa hasta el cuadro (nunca
 * menos que `cuadroMinimo`, nunca mas que el cupo), el sorteo al azar de
 * todos juntos, los cruces con sus punteros y el partido por el 3.º.
 * Devuelve 'started' | 'under' | 'skip'.
 */
async function armarCuadro(t, ahora) {
  const fresco = await Torneo.porId(t.id);
  if (!fresco || fresco.estado !== Torneo.ESTADO.INSCRIPCION) return { r: 'skip' };
  // Si un arranque anterior se cayo a la mitad, sus cruces sobran.
  await Torneo.borrarCuadro(t.id);

  let regs = (await Torneo.inscritos(t.id)).filter((r) => r.estado === Torneo.INSCRIPCION.INSCRITO);
  let ausentes = [];
  let sinCupo = [];

  // SE ARMA CON LOS QUE ESTAN: al cuadro entran solo los que pasaron por la
  // ventana. Los demas quedan «ausente» (no se borran: la pizarra sigue
  // diciendo cuantos se anotaron) y reciben «Llegaste tarde».
  if (aplicaPresentes(t)) {
    const desde = ahora - (ventanaMs() + TICK_MS + 5_000);
    const humanos = regs.filter((r) => !r.esBot);
    const pres = humanos.filter((r) => estuvoEnLineaDesde(r.userId, desde));
    ausentes = humanos.filter((r) => !pres.includes(r));
    const porLlegada = [...pres].sort((a, b) => a.inscritoEn - b.inscritoEn || a.id - b.id);
    const conCupo = porLlegada.slice(0, t.cupo);
    sinCupo = porLlegada.slice(t.cupo);
    for (const r of ausentes) await Torneo.actualizarInscrito(r.id, { estado: Torneo.INSCRIPCION.AUSENTE });
    for (const r of sinCupo) await Torneo.actualizarInscrito(r.id, { estado: Torneo.INSCRIPCION.SIN_CUPO });
    regs = regs.filter((r) => r.esBot || conCupo.includes(r));
  }

  // Un torneo sin una sola persona no se juega: seria la casa contra la casa
  // (el truco lo arrancaba igual; aqui se cancela, ver seccion 211).
  if (!regs.some((r) => !r.esBot)) return { r: 'under', ausentes, sinCupo };

  if (t.relleno) {
    const cuadroN = Math.min(nextPow2(Math.max(t.cuadroMinimo, regs.length, 2)), t.cupo);
    const ya = new Set(regs.map((r) => r.userId));
    const libres = BOTS_DE_TORNEO.filter((b) => !ya.has(b.id)).slice(0, Math.max(0, cuadroN - regs.length));
    for (const b of libres) await Torneo.inscribir(t.id, { userId: b.id, username: b.nombre, avatar: b.avatar, esBot: true, inscritoEn: ahora });
    if (libres.length) regs = [...regs, ...(await Torneo.inscritos(t.id)).filter((r) => r.esBot && libres.some((b) => b.id === r.userId))];
  }
  if (!t.relleno && regs.length < t.minimo) return { r: 'under', ausentes, sinCupo };
  if (regs.length < 2) return { r: 'under', ausentes, sinCupo };

  // SORTEO AL AZAR (Raul, 30-jul en el truco): humanos y bots barajados
  // juntos con azar criptografico, desde un orden fijo.
  const sembrados = [...regs].sort((a, b) => a.inscritoEn - b.inscritoEn || a.id - b.id);
  for (let i = sembrados.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [sembrados[i], sembrados[j]] = [sembrados[j], sembrados[i]];
  }
  for (let i = 0; i < sembrados.length; i++) await Torneo.actualizarInscrito(sembrados[i].id, { siembra: i + 1 });

  const plan = generarCuadro(sembrados.map((r) => r.userId));
  const idPorClave = new Map();
  for (const c of plan.cruces) {
    const id = await Torneo.crearCruce({ torneoId: t.id, ronda: c.ronda, slot: c.slot, a: c.a, b: c.b, ganador: c.ganador, estado: c.estado, siguienteLado: c.siguienteLado });
    idPorClave.set(`${c.ronda}:${c.slot}`, id);
  }
  for (const c of plan.cruces) {
    if (c.siguienteRonda == null) continue;
    await Torneo.actualizarCruce(idPorClave.get(`${c.ronda}:${c.slot}`), { siguienteId: idPorClave.get(`${c.siguienteRonda}:${c.siguienteSlot}`) });
  }
  if (tercerPuestoAplica(t.premios[2], plan)) {
    await Torneo.crearCruce({ torneoId: t.id, ronda: plan.rondas, slot: SLOT_TERCER_PUESTO, estado: Torneo.CRUCE.PENDIENTE });
  }
  await Torneo.cambiarEstado(t.id, Torneo.ESTADO.INSCRIPCION, Torneo.ESTADO.JUGANDO);
  // Para el pase de batalla, jugar el torneo cuenta desde que entra al cuadro.
  for (const r of regs) if (esCuenta(r.userId)) pase.alJugarTorneo(r.userId).catch(() => {});
  return { r: 'started', ausentes, sinCupo };
}

async function avisarLlegaronTarde(t, ausentes, sinCupo, ahora) {
  if (!ausentes.length && !sinCupo.length) return;
  const prox = await Torneo.proximoRelampago(ahora).catch(() => null);
  const puerta = puertaMs();
  const siguiente = prox ? ` Anótate a ${prox.nombre}.` : '';
  const finPuerta = new Date((t.segundaHasta ?? t.empiezaEn + ventanaMs()) + puerta).toISOString();
  for (const r of ausentes) {
    aUsuario(r.userId, 'tournament:llegaste_tarde', { tournamentId: t.id, motivo: 'ausente', proximoId: prox?.id ?? null, puertaAbierta: puerta > 0, puertaHasta: puerta > 0 ? finPuerta : null });
    alBuzon(r.userId, {
      titulo: puerta > 0 ? '¡Todavía puedes entrar!' : 'Llegaste tarde',
      cuerpo: puerta > 0
        ? `${t.nombre} ya arrancó, pero tienes ${Math.max(1, Math.round(puerta / 60_000))} min para entrar. Abre la app y toca «Entrar ahora».`
        : `El cuadro de ${t.nombre} se armó con los que estaban conectados a la hora.${siguiente}`,
      datos: { torneoId: t.id }
    });
  }
  for (const r of sinCupo) {
    aUsuario(r.userId, 'tournament:llegaste_tarde', { tournamentId: t.id, motivo: 'sin_cupo', proximoId: prox?.id ?? null, puertaAbierta: false, puertaHasta: null });
    alBuzon(r.userId, { titulo: 'Se llenó el cuadro', cuerpo: `${t.nombre} arrancó con el cuadro lleno y no alcanzó tu puesto.${siguiente}`, datos: { torneoId: t.id } });
  }
}

/** Arranca los torneos a los que ya les llego la hora (startDueTournaments). */
export async function arrancarLosQueTocan(ahora = Date.now()) {
  for (const t of await Torneo.vencidos(ahora)) {
    try {
      if (await enVentana(t, ahora)) continue;
      const { r, ausentes = [], sinCupo = [] } = await armarCuadro(t, ahora);
      if (r === 'under') {
        await Torneo.cambiarEstado(t.id, Torneo.ESTADO.INSCRIPCION, Torneo.ESTADO.CANCELADO, { terminadoEn: ahora });
        actualizado(t.id, Torneo.ESTADO.CANCELADO);
        for (const i of (await Torneo.inscritos(t.id)).filter((x) => !x.esBot)) {
          alBuzon(i.userId, { titulo: `${t.nombre} no se jugó`, cuerpo: 'No llegó suficiente gente. Prueba con el próximo.', datos: { torneoId: t.id } });
        }
        continue;
      }
      if (r !== 'started') continue;
      await avisarLlegaronTarde(t, ausentes, sinCupo, ahora);
      await lanzarMesas(t.id);
      actualizado(t.id, Torneo.ESTADO.JUGANDO);
    } catch (err) {
      console.error(`Torneos: no se pudo arrancar el ${t.id} (lo retoma el próximo tick):`, err.message);
    }
  }
}

// ------------------------------------------------------------ las mesas

const nombreDe = (regs, id) => regs.find((r) => r.userId === id)?.username ?? 'Tu rival';

/** El id en la sala va con el MISMO tipo que trae el socket: numero para la cuenta, texto para el invitado. */
const idDeSala = (userId) => (esCuenta(userId) ? Number(userId) : userId);

function jugadorDeMesa(t, reg) {
  if (!reg.esBot) return { id: idDeSala(reg.userId), username: reg.username, avatar: reg.avatar || undefined, isBot: false };
  const b = BOT_POR_ID.get(reg.userId);
  const nivel = t.botNivel && t.botNivel !== 'persona' ? t.botNivel : b?.difficulty ?? 'normal';
  return { id: reg.userId, username: reg.username, avatar: reg.avatar || b?.avatar, isBot: true, difficulty: nivel, frase: b?.frase, estrellas: b?.estrellas };
}

/**
 * Crea las mesas que faltan (materializePendingTables): para cada cruce listo
 * o en juego, con sus dos jugadores, sin ganador y SIN mesa viva, una sala
 * pre-sentada. UN CRUCE, UNA MESA: el indice (cruce, numero) y el candado lo
 * aseguran. Abre el plazo de presentacion si no hay uno corriendo.
 */
export async function lanzarMesas(torneoId) {
  const t = await Torneo.porId(torneoId);
  if (!t || t.estado !== Torneo.ESTADO.JUGANDO || !rm) return [];
  const cs = await Torneo.cruces(t.id);
  const mesas = await Torneo.mesasDelTorneo(t.id);
  const regs = await Torneo.inscritos(t.id);
  const creadas = [];
  for (const c of cs) {
    if (c.ganador != null || ![Torneo.CRUCE.LISTO, Torneo.CRUCE.JUGANDO].includes(c.estado) || !c.a || !c.b) continue;
    const suyas = mesas.filter((m) => m.cruceId === c.id);
    if (suyas.some((m) => m.estado === 'playing')) continue;
    const ra = regs.find((r) => r.userId === c.a);
    const rb = regs.find((r) => r.userId === c.b);
    if (!ra || !rb) continue;
    const room = rm.crearMesaDeTorneo({ jugadores: [jugadorDeMesa(t, ra), jugadorDeMesa(t, rb)], puntos: t.puntos });
    let mesaId = null;
    const plazo = c.plazoEn ?? Date.now() + presentacionMs();
    try {
      mesaId = await Torneo.crearMesa({ cruceId: c.id, numero: Math.max(0, ...suyas.map((m) => m.numero)) + 1, code: room.code });
      // EL CRUCE QUE VOLVIO A «JUGANDO» (21-sep en el truco): solo se marca
      // jugando un cruce que siga sin ganador; si ya cerro, la mesa sobra.
      const marcado = mesaId && await Torneo.actualizarCruce(c.id, { estado: Torneo.CRUCE.JUGANDO, plazoEn: plazo }, 'AND ganador IS NULL AND estado <> ?', [Torneo.CRUCE.TERMINADO]);
      if (!marcado) throw new Error('el cruce ya cerró mientras se armaba su mesa');
    } catch (err) {
      if (mesaId) await Torneo.borrarMesa(mesaId).catch(() => {});
      rm.cerrarMesaDeTorneo(room.code);
      console.error(`Torneos: mesa del cruce ${c.id} descartada:`, err.message);
      continue;
    }
    room.torneo = { torneoId: t.id, cruceId: c.id, mesaId, ronda: c.ronda, nombre: t.nombre };
    creadas.push({ cruce: c, code: room.code, plazo });
    if (ra.esBot && rb.esBot) arrancarMesa(room);
  }
  if (creadas.length) {
    const totalRondas = Math.max(0, ...cs.map((c) => c.ronda));
    const participantes = regs.filter((r) => r.estado === Torneo.INSCRIPCION.INSCRITO).length;
    for (const k of creadas) avisarMesaLista(t, k.cruce, k.code, k.plazo, regs, totalRondas, participantes, false);
  }
  return creadas;
}

/** El llamado a la mesa (notifyTournamentTableReady + llamadoDeTorneo). */
function avisarMesaLista(t, c, code, plazo, regs, totalRondas, participantes, segunda) {
  for (const id of [c.a, c.b]) {
    if (!id || esBot(id)) continue;
    const rival = nombreDe(regs, id === c.a ? c.b : c.a);
    const llamado = segunda
      ? { title: '¡Segunda llamada!', body: 'Tu cruce del torneo no arrancó. Entra YA a tu mesa: tienes 60 segundos.', quedan: null }
      : llamadoDeTorneo(c.ronda, totalRondas, rival, Math.round(presentacionMs() / 60_000), participantes);
    aUsuario(id, 'tournament:table_ready', {
      tournamentId: t.id,
      tournamentName: t.nombre,
      tableId: code,
      code,
      deadlineAt: new Date(plazo).toISOString(),
      round: c.ronda,
      totalRondas,
      rivalName: rival,
      quedan: llamado.quedan || null,
      llamado: { title: llamado.title, body: llamado.body },
      segundaLlamada: segunda
    });
    // El aviso viejo, para la pantalla de antes (AvisoDeTorneo.jsx) mientras se rehace.
    aUsuario(id, 'torneo:partida', { torneoId: t.id, torneo: t.nombre, code, contra: rival, esperaMs: Math.max(0, plazo - Date.now()) });
    alBuzon(id, { titulo: llamado.title, cuerpo: llamado.body, datos: { torneoId: t.id, code } });
  }
}

/** Arranca una mesa de torneo (las dos personas llegaron, o es bot contra bot). */
function arrancarMesa(room) {
  if (!rm || room.started) return false;
  const r = rm.startGame(room.code);
  if (r?.error) {
    console.error('Torneos: no se pudo arrancar la mesa', room.code, r.error);
    return false;
  }
  const info = room.torneo;
  // Se presentaron: el plazo ya no significa nada. Si la mesa se pierde en un
  // reinicio, la nueva abre uno fresco.
  if (info) conCandado(() => Torneo.actualizarCruce(info.cruceId, { plazoEn: null }, 'AND ganador IS NULL')).catch(() => {});
  rm.broadcastLobby(room);
  rm.broadcastState(room);
  rm.playBotTurns(room);
  return true;
}

/**
 * Alguien entro a su mesa del torneo (room:join). ACEPTAR ES PRESENTARSE y
 * queda ESCRITO (presencia.ts, 20-ago en el truco): sobrevive a un reinicio.
 * Si ya estan todas las personas conectadas, la mesa arranca sola.
 */
export function alEntrarALaMesa(room, userId) {
  const info = room?.torneo;
  if (!info || room.started) return Promise.resolve(false);
  return conCandado(async () => {
    const c = await Torneo.cruce(info.cruceId);
    if (c && c.ganador == null) {
      if (c.a === String(userId) && !c.presenteA) await Torneo.actualizarCruce(c.id, { presenteA: Date.now() }, 'AND presente_a IS NULL');
      if (c.b === String(userId) && !c.presenteB) await Torneo.actualizarCruce(c.id, { presenteB: Date.now() }, 'AND presente_b IS NULL');
    }
    return intentarArrancar(room);
  });
}

/** Arranca si todas las personas de la mesa tienen su conexion viva. */
export function intentarArrancar(room) {
  if (!room?.torneo || room.started || !rm?.rooms.has(room.code)) return false;
  const personas = room.players.filter((p) => !p.isBot);
  if (!personas.every((p) => socketVivo(p.socketId))) return false;
  return arrancarMesa(room);
}

// ------------------------------------------------------------ fin de una partida

/**
 * Lo llama RoomManager._registrarSiTermino, el unico punto por el que pasan
 * todos los finales (normal, abandono, inactividad). Registra la partida y
 * hace avanzar el cuadro (advanceOnGameResult).
 */
export function alTerminarPartida(room, ganadorId) {
  const info = room?.torneo;
  if (!info) return Promise.resolve();
  const scores = room.game?.teamScores ?? [];
  const ma = Number(scores[room.players[0]?.team ?? 0] ?? 0);
  const mb = Number(scores[room.players[1]?.team ?? 1] ?? 0);
  return conCandado(() => avanzarPorPartida(info, ganadorId == null ? null : String(ganadorId), ma, mb))
    .catch((err) => console.error('Torneos: no se pudo avanzar el cuadro (lo retoma el reconciliador):', err.message));
}

async function avanzarPorPartida(info, ganador, ma, mb) {
  if (ganador == null) return;
  const mesa = (await Torneo.mesasDeCruce(info.cruceId)).find((m) => m.id === info.mesaId);
  if (!mesa) return; // la mesa ya no cuenta (walkover o relanzada): su final no mueve nada
  await Torneo.actualizarMesa(mesa.id, { estado: 'completed', ganador, marcadorA: ma, marcadorB: mb, terminadaEn: Date.now() }, 'AND ganador IS NULL');
  const c = await Torneo.cruce(info.cruceId);
  if (!c) return;
  if (c.ganador == null) {
    if (ganador !== c.a && ganador !== c.b) {
      console.error(`Torneos: el ganador ${ganador} no juega el cruce ${c.id}`);
      return;
    }
    await Torneo.actualizarCruce(c.id, { ganador, estado: Torneo.CRUCE.TERMINADO, motivo: 'partida', marcadorA: ma, marcadorB: mb, plazoEn: null, terminadoEn: Date.now() }, 'AND ganador IS NULL');
  } else if (c.ganador !== ganador) {
    console.error(`Torneos: el cruce ${c.id} ya estaba cerrado con otro ganador`);
    return;
  }
  await despuesDeCerrar(c.torneoId, await Torneo.cruce(c.id));
}

/** Coloca al ganador en el siguiente, baja al perdedor de la semi, y termina o lanza. */
async function despuesDeCerrar(torneoId, c) {
  if (c.siguienteId) {
    await ponerEnElSiguiente(c);
    await bajarPerdedorAlTercerPuesto(c);
  }
  const cs = await Torneo.cruces(torneoId);
  if (cuadroTerminado(cs)) {
    await terminarTorneo(torneoId);
    return;
  }
  await lanzarMesas(torneoId);
  actualizado(torneoId, Torneo.ESTADO.JUGANDO);
}

async function ponerEnElSiguiente(c) {
  const sig = await Torneo.cruce(c.siguienteId);
  if (!sig) return;
  const lado = c.siguienteLado === 'A' ? 'a' : 'b';
  const actual = sig[lado];
  if (actual != null && actual !== c.ganador) {
    console.error(`Torneos: el lado ${c.siguienteLado} del cruce ${sig.id} ya lo ocupaba otro`);
    return;
  }
  if (actual == null) await Torneo.actualizarCruce(sig.id, lado === 'a' ? { a: c.ganador } : { b: c.ganador });
  await marcarListoSiToca(sig.id);
}

async function marcarListoSiToca(cruceId) {
  const c = await Torneo.cruce(cruceId);
  if (c && c.estado === Torneo.CRUCE.PENDIENTE && c.a != null && c.b != null) {
    await Torneo.actualizarCruce(c.id, { estado: Torneo.CRUCE.LISTO }, 'AND estado = ?', [Torneo.CRUCE.PENDIENTE]);
  }
}

/** El perdedor de cada semifinal baja al cruce por el 3.º (semi 0 → A, semi 1 → B). */
async function bajarPerdedorAlTercerPuesto(semi) {
  const perdedor = semi.ganador === semi.a ? semi.b : semi.a;
  if (!perdedor) return;
  const final = await Torneo.cruce(semi.siguienteId);
  if (!final || final.siguienteId != null) return;
  const tercer = (await Torneo.cruces(semi.torneoId)).find((x) => x.ronda === final.ronda && x.slot === SLOT_TERCER_PUESTO && x.siguienteId == null);
  if (!tercer) return;
  const lado = semi.slot === 0 ? 'a' : 'b';
  if (tercer[lado] === perdedor) return;
  if (tercer[lado] != null) {
    console.error(`Torneos: el lado del 3.º puesto ya lo ocupaba otro (cruce ${tercer.id})`);
    if (tercer.estado !== Torneo.CRUCE.PENDIENTE) return;
  }
  await Torneo.actualizarCruce(tercer.id, lado === 'a' ? { a: perdedor } : { b: perdedor });
  await marcarListoSiToca(tercer.id);
}

/**
 * El torneo termino: los puestos (leidos de la final y del 3.º), la copa y
 * los puntos de clasificacion. Los premios se pagan UNA sola vez: la marca
 * `premiado` va antes de pagar (si se cae entre medio, el reconciliador ve el
 * torneo terminado sin premiar y lo termina de pagar).
 */
async function terminarTorneo(torneoId) {
  const t = await Torneo.porId(torneoId);
  if (!t || t.estado === Torneo.ESTADO.CANCELADO) return;
  if (t.estado === Torneo.ESTADO.JUGANDO) {
    const cs = await Torneo.cruces(t.id);
    const regs = (await Torneo.inscritos(t.id)).filter((r) => r.estado === Torneo.INSCRIPCION.INSCRITO);
    const puestos = puestosDelCuadro(cs, regs.map((r) => ({ userId: r.userId, siembra: r.siembra })));
    for (const p of puestos) {
      const r = regs.find((x) => x.userId === p.userId);
      if (r) await Torneo.actualizarInscrito(r.id, { puesto: p.puesto });
    }
    const campeon = regs.find((r) => r.userId === puestos[0]?.userId);
    await Torneo.cambiarEstado(t.id, Torneo.ESTADO.JUGANDO, Torneo.ESTADO.TERMINADO, {
      terminadoEn: Date.now(), campeonId: campeon?.userId ?? null, campeonNombre: campeon?.username ?? null, campeonBot: campeon?.esBot ? 1 : 0
    });
  }
  await premiar(torneoId);
}

async function premiar(torneoId) {
  const t = await Torneo.porId(torneoId);
  if (!t || t.estado !== Torneo.ESTADO.TERMINADO || t.premiado) return;
  if (!(await Torneo.marcarPremiado(t.id))) return;
  const regs = await Torneo.inscritos(t.id);
  const podio = regs.filter((r) => r.puesto != null && r.puesto <= 3).sort((a, b) => a.puesto - b.puesto);
  for (const r of podio) {
    const puntos = t.premios[r.puesto - 1] ?? 0;
    if (!r.esBot && esCuenta(r.userId) && puntos > 0) {
      try {
        const cambio = await Ranking.sumarPuntos(Number(r.userId), puntos);
        aUsuario(r.userId, 'ranking:cambio', { userId: Number(r.userId), ...cambio });
      } catch (err) {
        console.error('Torneos: no se pudieron sumar los puntos del premio:', err.message);
      }
    }
    if (!r.esBot) {
      const titulo = r.puesto === 1 ? `¡Ganaste ${t.nombre}!` : r.puesto === 2 ? `Segundo en ${t.nombre}` : `Tercero en ${t.nombre}`;
      const cuerpo = r.puesto === 1
        ? `${puntos > 0 ? `+${puntos} puntos y ` : ''}una copa para el palmarés.`
        : puntos > 0 ? `+${puntos} puntos de clasificación.` : 'Te quedas en el podio.';
      alBuzon(r.userId, { titulo, cuerpo, datos: { torneoId: t.id, puesto: r.puesto, puntos } });
    }
  }
  const campeon = podio.find((r) => r.puesto === 1);
  if (campeon && !campeon.esBot && esCuenta(campeon.userId)) pase.alGanarTorneo(Number(campeon.userId)).catch(() => {});
  const payload = {
    tournamentId: t.id,
    tournamentName: t.nombre,
    podio: podio.map((r) => ({ puesto: r.puesto, userId: r.userId, username: r.username, avatar: r.avatar, esBot: r.esBot, puntos: t.premios[r.puesto - 1] ?? 0 }))
  };
  actualizado(t.id, Torneo.ESTADO.TERMINADO);
  aTodos('tournament:podium', payload);
  if (campeon) aTodos('torneo:campeon', { torneoId: t.id, torneo: t.nombre, campeon: campeon.username, premioPuntos: t.premios[0] });
}

// ------------------------------------------------------------ el walkover

/**
 * Cierra un cruce SIN partida (resolveMatchByWalkover): la mesa que no
 * arranco se cierra y el ganador pasa por el mismo camino de siempre.
 */
async function resolverPorWalkover(cruceId, ganador, motivo) {
  const c = await Torneo.cruce(cruceId);
  if (!c) throw new Error('Ese cruce no existe');
  if (c.ganador != null) {
    if (c.ganador !== ganador) throw new Error('Ese cruce ya se resolvió con otro ganador');
    return c;
  }
  if (ganador !== c.a && ganador !== c.b) throw new Error('Ese jugador no juega este cruce');
  for (const m of await Torneo.mesasDeCruce(c.id)) {
    if (m.estado !== 'playing') continue;
    rm?.cerrarMesaDeTorneo(m.code, motivo);
    await Torneo.borrarMesa(m.id);
  }
  const ok = await Torneo.actualizarCruce(c.id, { ganador, estado: Torneo.CRUCE.TERMINADO, motivo, plazoEn: null, terminadoEn: Date.now() }, 'AND ganador IS NULL');
  if (!ok) return Torneo.cruce(c.id);
  const cerrado = await Torneo.cruce(c.id);
  await despuesDeCerrar(c.torneoId, cerrado);
  return cerrado;
}

/** Quienes dieron la cara en un cruce: lo escrito en la base y quien esta sentado ahora. */
async function presentesDe(c) {
  const present = new Set();
  if (c.presenteA && c.a) present.add(c.a);
  if (c.presenteB && c.b) present.add(c.b);
  for (const m of await Torneo.mesasDeCruce(c.id)) {
    if (m.estado !== 'playing') continue;
    const room = rm?.rooms.get(m.code);
    for (const p of room?.players ?? []) {
      if (!p.isBot && socketVivo(p.socketId)) {
        present.add(String(p.id));
        if (String(p.id) === c.a && !c.presenteA) await Torneo.actualizarCruce(c.id, { presenteA: Date.now() }, 'AND presente_a IS NULL');
        if (String(p.id) === c.b && !c.presenteB) await Torneo.actualizarCruce(c.id, { presenteB: Date.now() }, 'AND presente_b IS NULL');
      }
    }
  }
  return present;
}

/**
 * EL BARRIDO DE PLAZOS (sweepPresentationDeadlines). Para cada cruce con el
 * plazo vencido:
 *   · recien arrancado el servidor: NADIE PIERDE POR UN REINICIO NUESTRO; el
 *     plazo se EMPUJA un plazo completo (nunca se anula);
 *   · si la partida ya arranco, se limpia el plazo;
 *   · si los DOS se presentaron y no coincidieron: SEGUNDA LLAMADA, 60 s mas,
 *     una sola vez;
 *   · si no: walkover (pasa el que vino; el bot nunca es no-show; si no, la
 *     mejor siembra).
 */
export async function barrerPlazos(ahora = Date.now()) {
  for (const c of await Torneo.crucesVencidos(ahora)) {
    try {
      if (!c.a || !c.b) continue;
      if (ahora - arranque < GRACIA_TRAS_REINICIO_MS) {
        const nuevo = ahora + Math.max(presentacionMs(), GRACIA_TRAS_REINICIO_MS - (ahora - arranque) + 15_000);
        await Torneo.actualizarCruce(c.id, { plazoEn: nuevo });
        continue;
      }
      const mesas = (await Torneo.mesasDeCruce(c.id)).filter((m) => m.estado === 'playing');
      const salas = mesas.map((m) => rm?.rooms.get(m.code)).filter(Boolean);
      if (salas.some((s) => s.started)) {
        await Torneo.actualizarCruce(c.id, { plazoEn: null });
        continue;
      }
      const present = await presentesDe(c);
      const fresco = await Torneo.cruce(c.id);
      if (!fresco.segundaLlamada && fresco.presenteA && fresco.presenteB) {
        const plazo = ahora + segundaMs();
        if (await Torneo.actualizarCruce(c.id, { segundaLlamada: 1, plazoEn: plazo }, 'AND segunda_llamada = 0')) {
          const t = await Torneo.porId(c.torneoId);
          const regs = await Torneo.inscritos(c.torneoId);
          if (salas.length) {
            for (const s of salas) avisarMesaLista(t, fresco, s.code, plazo, regs, 0, 0, true);
          } else {
            for (const m of mesas) await Torneo.borrarMesa(m.id);
            await lanzarMesas(c.torneoId);
            const nueva = (await Torneo.mesasDeCruce(c.id)).find((m) => m.estado === 'playing');
            if (nueva) avisarMesaLista(t, fresco, nueva.code, plazo, regs, 0, 0, true);
          }
          actualizado(c.torneoId, Torneo.ESTADO.JUGANDO);
        }
        continue;
      }
      const regs = await Torneo.inscritos(c.torneoId);
      const siembra = (id) => regs.find((r) => r.userId === id)?.siembra ?? null;
      const ganador = elegirGanadorWalkover([c.a, c.b], [...present], esBot, siembra);
      await resolverPorWalkover(c.id, ganador, 'no_show');
    } catch (err) {
      console.error(`Torneos: el barrido falló en el cruce ${c.id} (reintenta el próximo tick):`, err.message);
    }
  }
}

// ------------------------------------------------------------ el reconciliador

/**
 * RECUPERACION (reconcileOrphanTournaments): para cada torneo en juego,
 *   · la partida que termino pero el cuadro no registro → se avanza ahora;
 *   · la mesa que ya no esta en memoria (reinicio) → se tira y el cruce
 *     queda para una mesa nueva con plazo fresco;
 *   · si con eso el cuadro esta completo → se termina y se premia;
 *   · si no → se lanzan las mesas que falten.
 * Y los terminados que quedaron sin premiar se terminan de premiar.
 */
export async function reconciliar() {
  for (const t of await Torneo.conEstado([Torneo.ESTADO.JUGANDO])) {
    try {
      const cs = await Torneo.cruces(t.id);
      for (const m of await Torneo.mesasDelTorneo(t.id)) {
        if (m.estado !== 'playing') continue;
        const room = rm?.rooms.get(m.code);
        const c = cs.find((x) => x.id === m.cruceId);
        if (!room || room.torneo?.mesaId !== m.id) {
          await Torneo.borrarMesa(m.id);
          if (c && c.ganador == null) await Torneo.actualizarCruce(c.id, { plazoEn: null });
          continue;
        }
        if (room.game?.status === 'game-over') {
          const equipo = room.game.state?.result?.winnerTeam ?? room.game.winningTeam;
          const g = room.players.find((p) => equipo != null && p.team === equipo);
          const scores = room.game.teamScores ?? [];
          if (g) {
            await avanzarPorPartida(room.torneo, String(g.id), Number(scores[room.players[0]?.team ?? 0] ?? 0), Number(scores[room.players[1]?.team ?? 1] ?? 0));
          } else {
            // Termino sin ganador (no deberia pasar en 1 contra 1): se tira y
            // el cruce se vuelve a jugar en una mesa nueva.
            rm.cerrarMesaDeTorneo(m.code, 'sin-ganador');
            await Torneo.borrarMesa(m.id);
            if (c && c.ganador == null) await Torneo.actualizarCruce(c.id, { plazoEn: null });
          }
        }
      }
      const ahora = await Torneo.cruces(t.id);
      if (cuadroTerminado(ahora)) await terminarTorneo(t.id);
      else await lanzarMesas(t.id);
    } catch (err) {
      console.error(`Torneos: el reconciliador falló con el ${t.id}:`, err.message);
    }
  }
  for (const t of await Torneo.conEstado([Torneo.ESTADO.TERMINADO])) {
    if (!t.premiado) await premiar(t.id).catch((err) => console.error('Torneos: premio pendiente:', err.message));
  }
}

// ------------------------------------------------------------ los recordatorios

/** A los 10 y a los 5 minutos (perillas), una sola vez por hito (recordatorios.ts). */
export async function avisarProximos(ahora = Date.now()) {
  const hitos = normalizarHitos([perilla('torneos.recordatorio1Min'), perilla('torneos.recordatorio2Min')]);
  if (!hitos.length) return;
  for (const t of await Torneo.conEstado([Torneo.ESTADO.INSCRIPCION])) {
    if (t.empiezaEn <= ahora || t.empiezaEn - ahora > hitos[0] * 60_000) continue;
    const hito = hitoQueToca(t.empiezaEn, hitos, t.recordatorioMin, ahora);
    if (hito == null) continue;
    const marcado = await Torneo.actualizarTorneo(t.id, { recordatorioMin: hito }, 'AND (recordatorio_min IS NULL OR recordatorio_min > ?)', [hito]);
    if (!marcado) continue;
    const humanos = (await Torneo.inscritos(t.id)).filter((r) => !r.esBot && r.estado === Torneo.INSCRIPCION.INSCRITO);
    const msg = mensajeDelHito({ hito, esUltimo: hito === hitos[hitos.length - 1], nombre: t.nombre, hora: horaEnZona(new Date(t.empiezaEn), RELAMPAGO_TZ), anotados: humanos.length });
    for (const h of humanos) {
      aUsuario(h.userId, 'tournament:recordatorio', { tournamentId: t.id, hito, title: msg.title, body: msg.body, startAt: new Date(t.empiezaEn).toISOString() });
      alBuzon(h.userId, { titulo: msg.title, cuerpo: msg.body, datos: { torneoId: t.id } });
    }
  }
}

// ------------------------------------------------------------ la grilla del Relampago

/**
 * Un tick de la grilla (runRelampagoOnce): con el interruptor prendido, cada
 * franja dentro de la anticipacion tiene su torneo. Idempotente por el
 * NOMBRE dentro del dia (posponer no duplica). Apagada, no hace nada.
 */
export async function publicarRelampagos(ahora = Date.now()) {
  const cfg = await getRelampago();
  if (!cfg.on || !cfg.prendidoPor) return { publicados: 0, yaEstaban: 0 };
  const franjas = franjasEntre(cfg, new Date(ahora), new Date(ahora + cfg.anticipacionHoras * 3600_000));
  let publicados = 0;
  let yaEstaban = 0;
  for (const f of franjas) {
    try {
      const nombre = nombreDeFranja(f);
      if (await Torneo.hayRelampago(nombre, inicioDelDiaEnCaracas(f).getTime())) {
        yaEstaban += 1;
        continue;
      }
      const id = await Torneo.crear({
        nombre, tipo: 'relampago', empiezaEn: f.getTime(), puntos: cfg.puntos, cupo: cfg.capacidad, minimo: 2, relleno: true,
        cuadroMinimo: cfg.cuadroMinimo, botNivel: cfg.botNivel, premios: premiosDelRelampago(), creadoPor: cfg.prendidoPor
      });
      publicados += 1;
      actualizado(id, Torneo.ESTADO.INSCRIPCION);
    } catch (err) {
      console.error('Relámpago: no se pudo publicar la franja (reintenta el próximo minuto):', err.message);
    }
  }
  return { publicados, yaEstaban };
}

export async function proximaFranja(ahora = Date.now()) {
  const cfg = await getRelampago();
  return franjasEntre(cfg, new Date(ahora), new Date(ahora + 7 * 24 * 3600_000))[0] ?? null;
}

// ------------------------------------------------------------ inactividad en la mesa

/**
 * QUIETO EN LA MESA DEL TORNEO (idleForfeitSeconds del truco, 120 s): si al
 * que le toca no hace una jugada PROPIA en ese tiempo, pierde la partida. El
 * reloj se reinicia con cada jugada suya y con cada reparto; «la mesa juega
 * por ti» NO cuenta como jugada suya. Solo mesas de torneo: las normales
 * siguen igual (la mesa juega por el ausente y la partida sigue).
 */
export function barrerQuietos(ahora = Date.now()) {
  const idleMs = Number(perilla('torneos.inactividadMs'));
  if (!rm || !(idleMs > 0)) return 0;
  let n = 0;
  for (const room of [...rm.rooms.values()]) {
    if (!room.torneo || !room.started || room.game?.status !== 'playing') continue;
    const p = room.game.getCurrentPlayer();
    if (!p || p.isBot) continue;
    const desde = p._ultimaPropia ?? room.game.empezoEn ?? ahora;
    if (ahora - desde < idleMs) continue;
    libreta.anotar(room.code, `${p.username} no jugó en ${Math.round(idleMs / 1000)} s: pierde la partida del torneo.`, p.username);
    if (rm.abandonarPartida(room.code, p.id)) n += 1;
  }
  return n;
}

// ------------------------------------------------------------ voy / no voy / puerta

async function cruceActivoDe(torneoId, userId) {
  const cs = await Torneo.cruces(torneoId);
  return cs.find((c) => c.ganador == null && [Torneo.CRUCE.LISTO, Torneo.CRUCE.JUGANDO].includes(c.estado) && (c.a === String(userId) || c.b === String(userId))) ?? null;
}

/** «VOY» (presencia.ts): queda escrito y el plazo corre la prorroga, UNA vez por cruce. */
export function decirQueVoy(torneoId, userId) {
  return conCandado(async () => {
    const c = await cruceActivoDe(torneoId, userId);
    if (!c) return { error: 'No tienes una mesa esperándote', status: 404 };
    const lado = c.a === String(userId) ? 'A' : 'B';
    const ahora = Date.now();
    const daProrroga = c.prorrogaEn == null && c.plazoEn != null;
    const plazo = daProrroga ? c.plazoEn + prorrogaMin() * 60_000 : c.plazoEn;
    await Torneo.actualizarCruce(c.id, {
      ...(lado === 'A' ? { presenteA: c.presenteA ?? ahora } : { presenteB: c.presenteB ?? ahora }),
      ...(daProrroga ? { prorrogaEn: ahora, plazoEn: plazo } : {})
    });
    return { ok: true, prorrogaMinutos: daProrroga ? prorrogaMin() : 0, deadlineAt: plazo ? new Date(plazo).toISOString() : null };
  });
}

/** «NO VOY»: cede el cruce y el rival pasa EN EL ACTO. */
export function decirQueNoVoy(torneoId, userId) {
  return conCandado(async () => {
    const c = await cruceActivoDe(torneoId, userId);
    if (!c) return { error: 'No tienes una mesa esperándote', status: 404 };
    const rival = c.a === String(userId) ? c.b : c.a;
    if (!rival) return { error: 'Ese cruce todavía no tiene rival', status: 409 };
    await resolverPorWalkover(c.id, rival, 'cedio_el_cruce');
    return { ok: true };
  });
}

const finDePuerta = (t) => (t.segundaHasta ?? t.empiezaEn + ventanaMs()) + puertaMs();

/**
 * LA PUERTA ABIERTA (puertaAbierta.ts, Raul 23-sep): el que quedo «ausente»
 * toma el lugar de un directo que espera la previa y juega contra el YA. El
 * cuadro no cambia de forma; si no quedan directos esperando, no hay puesto.
 */
export function entrarPorLaPuerta(torneoId, userId, ahora = Date.now(), elegir = (n) => crypto.randomInt(n)) {
  return conCandado(async () => {
    const t = await Torneo.porId(torneoId);
    if (!t || !aplicaPresentes(t) || puertaMs() === 0) return { ok: false, codigo: 'no_aplica', motivo: 'Este torneo no tiene puerta abierta.' };
    if (t.estado !== Torneo.ESTADO.JUGANDO || ahora > finDePuerta(t)) return { ok: false, codigo: 'cerrada', motivo: 'Ya se cerró la puerta de este torneo.' };
    const reg = await Torneo.inscripcion(t.id, userId);
    if (!reg) return { ok: false, codigo: 'no_inscrito', motivo: 'No estabas anotado en este torneo.' };
    if (reg.estado === Torneo.INSCRIPCION.INSCRITO) return { ok: false, codigo: 'ya_estas', motivo: 'Ya estás en el cuadro.' };
    if (![Torneo.INSCRIPCION.AUSENTE, Torneo.INSCRIPCION.SIN_CUPO].includes(reg.estado)) return { ok: false, codigo: 'no_inscrito', motivo: 'No estabas anotado en este torneo.' };
    const cs = await Torneo.cruces(t.id);
    const huecos = huecosDePuerta(cs);
    if (!huecos.length) return { ok: false, codigo: 'sin_hueco', motivo: 'Ya no queda puesto en este cuadro.' };
    const hueco = huecos[Math.min(huecos.length - 1, Math.max(0, elegir(huecos.length)))];
    const slotNuevo = Math.max(-1, ...cs.filter((c) => c.ronda === 1).map((c) => c.slot)) + 1;
    await Torneo.actualizarCruce(hueco.cruceId, hueco.lado === 'A' ? { a: null } : { b: null });
    const nuevo = await Torneo.crearCruce({ torneoId: t.id, ronda: 1, slot: slotNuevo, a: hueco.directo, b: String(userId), estado: Torneo.CRUCE.LISTO, siguienteId: hueco.cruceId, siguienteLado: hueco.lado });
    const siembras = (await Torneo.inscritos(t.id)).map((r) => r.siembra ?? 0);
    await Torneo.actualizarInscrito(reg.id, { estado: Torneo.INSCRIPCION.INSCRITO, siembra: Math.max(0, ...siembras) + 1 });
    await lanzarMesas(t.id);
    actualizado(t.id, Torneo.ESTADO.JUGANDO);
    return { ok: true, cruceId: nuevo, rivalUserId: hueco.directo };
  });
}

// ------------------------------------------------------------ el cuarto del socio

const limpiarNombre = (s) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

/** Crea un torneo «como tal» (detras de la llave). */
export async function crearTorneo(datos = {}) {
  const nombre = limpiarNombre(datos.nombre);
  if (nombre.length < 3) return { error: 'Ponle un nombre de al menos 3 letras', status: 400 };
  const empiezaEn = typeof datos.empiezaEn === 'number' ? datos.empiezaEn : Date.parse(String(datos.empiezaEn ?? ''));
  if (!Number.isFinite(empiezaEn) || empiezaEn <= Date.now()) return { error: 'La hora de arranque tiene que ser en el futuro', status: 400 };
  const puntos = datos.puntos == null ? 100 : Number(datos.puntos);
  if (!PUNTOS_DE_TORNEO.includes(puntos)) return { error: `Los puntos van entre ${PUNTOS_DE_TORNEO.join(', ')}`, status: 400 };
  const cupo = datos.cupo == null ? 32 : Number(datos.cupo);
  if (!Number.isInteger(cupo) || cupo < 2 || cupo > 256) return { error: 'El cupo va de 2 a 256', status: 400 };
  const cuadroMinimo = datos.cuadroMinimo == null ? Math.min(16, cupo) : Number(datos.cuadroMinimo);
  if (!Number.isInteger(cuadroMinimo) || cuadroMinimo < 2 || cuadroMinimo > cupo) return { error: 'El cuadro mínimo va de 2 al cupo', status: 400 };
  const minimo = datos.minimo == null ? 2 : Number(datos.minimo);
  if (!Number.isInteger(minimo) || minimo < 2 || minimo > cupo) return { error: 'El mínimo va de 2 al cupo', status: 400 };
  const premios = Array.isArray(datos.premios) ? datos.premios.slice(0, 3).map(Number) : [100, 50, 25];
  while (premios.length < 3) premios.push(0);
  if (premios.some((p) => !Number.isInteger(p) || p < 0 || p > 10000)) return { error: 'Los puntos del premio van de 0 a 10000', status: 400 };
  const botNivel = datos.botNivel ?? 'casa';
  if (!NIVELES_DE_BOT.includes(botNivel)) return { error: 'Nivel de bot inválido', status: 400 };
  const id = await Torneo.crear({ nombre, tipo: 'normal', empiezaEn, puntos, cupo, minimo, relleno: datos.relleno !== false, cuadroMinimo, botNivel, premios, creadoPor: 'socio' });
  actualizado(id, Torneo.ESTADO.INSCRIPCION);
  return { ok: true, torneo: await Torneo.porId(id) };
}

export function cancelarTorneo(torneoId) {
  return conCandado(async () => {
    const t = await Torneo.porId(torneoId);
    if (!t) return { error: 'Torneo no encontrado', status: 404 };
    if (t.estado === Torneo.ESTADO.TERMINADO) return { error: 'El torneo ya terminó; no se puede cancelar', status: 400 };
    if (t.estado === Torneo.ESTADO.CANCELADO) return { ok: true, torneo: t };
    for (const m of await Torneo.mesasDelTorneo(t.id)) {
      if (m.estado !== 'playing') continue;
      rm?.cerrarMesaDeTorneo(m.code, 'cancelado');
      await Torneo.actualizarMesa(m.id, { estado: 'abandoned' });
    }
    await Torneo.cambiarEstado(t.id, t.estado, Torneo.ESTADO.CANCELADO, { terminadoEn: Date.now() });
    actualizado(t.id, Torneo.ESTADO.CANCELADO);
    for (const i of (await Torneo.inscritos(t.id)).filter((x) => !x.esBot)) {
      alBuzon(i.userId, { titulo: `${t.nombre} se canceló`, cuerpo: 'La casa canceló este torneo. Prueba con el próximo.', datos: { torneoId: t.id } });
    }
    return { ok: true, torneo: await Torneo.porId(t.id) };
  });
}

/** Rellena los cupos libres con la casa (fill-bots). Solo con la inscripcion abierta. */
export function rellenarConBots(torneoId, cuantos) {
  return conCandado(async () => {
    const t = await Torneo.porId(torneoId);
    if (!t) return { error: 'Torneo no encontrado', status: 404 };
    if (t.estado !== Torneo.ESTADO.INSCRIPCION) return { error: 'La inscripción no está abierta', status: 400 };
    const regs = (await Torneo.inscritos(t.id)).filter((r) => r.estado === Torneo.INSCRIPCION.INSCRITO);
    const ya = new Set(regs.map((r) => r.userId));
    const libres = BOTS_DE_TORNEO.filter((b) => !ya.has(b.id));
    const hueco = Math.max(0, t.cupo - regs.length);
    const quiero = Math.min(cuantos == null ? hueco : Math.max(0, Number(cuantos) || 0), hueco, libres.length);
    for (const b of libres.slice(0, quiero)) await Torneo.inscribir(t.id, { userId: b.id, username: b.nombre, avatar: b.avatar, esBot: true });
    actualizado(t.id, t.estado);
    return { ok: true, agregados: quiero, cupo: t.cupo, inscritos: regs.length + quiero };
  });
}

export function walkoverDelSocio(torneoId, cruceId, ganador) {
  return conCandado(async () => {
    const c = await Torneo.cruce(cruceId);
    if (!c || c.torneoId !== Number(torneoId)) return { error: 'Cruce no encontrado', status: 404 };
    if (c.ganador != null) return { error: 'El cruce ya está cerrado', status: 409 };
    if (String(ganador) !== c.a && String(ganador) !== c.b) return { error: 'Ese jugador no juega este cruce', status: 400 };
    await resolverPorWalkover(c.id, String(ganador), 'socio');
    return { ok: true };
  });
}

/** Mesa nueva para un cruce trancado: tira la vieja y abre plazo fresco. */
export function relanzarCruce(torneoId, cruceId) {
  return conCandado(async () => {
    const c = await Torneo.cruce(cruceId);
    if (!c || c.torneoId !== Number(torneoId)) return { error: 'Cruce no encontrado', status: 404 };
    if (c.ganador != null || !c.a || !c.b) return { error: 'Ese cruce no se puede relanzar', status: 409 };
    for (const m of await Torneo.mesasDeCruce(c.id)) {
      if (m.estado !== 'playing') continue;
      rm?.cerrarMesaDeTorneo(m.code, 'relanzada');
      await Torneo.borrarMesa(m.id);
    }
    await Torneo.actualizarCruce(c.id, { plazoEn: Date.now() + presentacionMs(), estado: Torneo.CRUCE.LISTO });
    const creadas = await lanzarMesas(c.torneoId);
    return { ok: true, code: creadas.find((k) => k.cruce.id === c.id)?.code ?? null };
  });
}

export function posponer(torneoId, minutos) {
  return conCandado(async () => {
    const t = await Torneo.porId(torneoId);
    if (!t) return { error: 'Torneo no encontrado', status: 404 };
    const m = Number(minutos);
    if (!Number.isInteger(m) || m < 1 || m > 1440) return { error: 'Minutos inválidos (1 a 1440)', status: 400 };
    if (t.estado !== Torneo.ESTADO.INSCRIPCION) return { error: 'Solo se pospone durante la inscripción', status: 409 };
    const nuevo = Math.max(t.empiezaEn, Date.now()) + m * 60_000;
    await Torneo.actualizarTorneo(t.id, { empiezaEn: nuevo });
    actualizado(t.id, t.estado);
    return { ok: true, startAt: new Date(nuevo).toISOString() };
  });
}

/** La config del Relampago con sus puntos por puesto (que viven en perillas). */
export async function configRelampago() {
  const cfg = await getRelampago();
  const [campeon, segundo, tercero] = premiosDelRelampago();
  return { ...cfg, premios: { campeon, segundo, tercero }, proximaFranja: (await proximaFranja())?.toISOString() ?? null };
}

export async function guardarRelampago(cambios = {}) {
  const { premios, ...resto } = cambios;
  if (premios && typeof premios === 'object') {
    if (premios.campeon != null) await Config.guardar('relampago.premioCampeon', premios.campeon);
    if (premios.segundo != null) await Config.guardar('relampago.premioSegundo', premios.segundo);
    if (premios.tercero != null) await Config.guardar('relampago.premioTercero', premios.tercero);
  }
  const antes = await getRelampago();
  if (resto.on === true && !antes.on) {
    resto.prendidoPor = typeof resto.prendidoPor === 'string' && resto.prendidoPor.trim() ? resto.prendidoPor.trim().slice(0, 60) : 'socio';
    resto.prendidoEn = new Date().toISOString();
  }
  delete resto.modo;
  await setRelampago(resto);
  // Prenderla publica en el acto: no hace falta esperar el minuto.
  if (resto.on === true) await conCandado(() => publicarRelampagos()).catch(() => {});
  return configRelampago();
}

// ------------------------------------------------------------ espectar

/**
 * ¿Puede mirar esta mesa? (canSpectateTournamentTable). El anotado del torneo
 * mira cualquier partida; los demas, solo la semifinal y la final.
 */
export async function puedeMirar(userId, room) {
  const info = room?.torneo;
  if (!info) return false;
  if (userId != null && (await Torneo.inscripcion(info.torneoId, userId))) return true;
  const cs = await Torneo.cruces(info.torneoId);
  const maxRonda = Math.max(0, ...cs.map((c) => c.ronda));
  return maxRonda > 0 && info.ronda >= maxRonda - 1;
}

// ------------------------------------------------------------ el reloj de todo

let tickDesde = null;
/** Un tick: recordatorios, arranques, plazos y reconciliador. Cada etapa falla sola. */
export async function tick(ahora = Date.now()) {
  for (const [nombre, etapa] of [
    ['recordatorios', () => avisarProximos(ahora)],
    ['arranque', () => arrancarLosQueTocan(ahora)],
    ['plazos', () => barrerPlazos(ahora)],
    ['reconciliador', () => reconciliar()]
  ]) {
    try {
      await conCandado(etapa);
    } catch (err) {
      console.error(`Torneos: la etapa ${nombre} falló (el tick sigue):`, err.message);
    }
  }
}

/** Enciende los relojes: el tick de 15 s (con candado de solapamiento), la grilla y los quietos. */
export function encender(servidorIo, manager) {
  conectar(servidorIo, manager);
  arranque = Date.now();
  const uno = () => {
    const ahora = Date.now();
    if (tickDesde !== null && ahora - tickDesde < TICK_MS * 5) return;
    tickDesde = ahora;
    tick().finally(() => { tickDesde = null; });
  };
  // Una pasada al arrancar: el reconciliador retoma lo que quedo a medias.
  setTimeout(uno, 1_000).unref?.();
  latidos.push(setInterval(uno, TICK_MS));
  latidos.push(setInterval(() => conCandado(() => publicarRelampagos()).catch((e) => console.error('Relámpago:', e.message)), GRILLA_MS));
  latidos.push(setInterval(() => barrerQuietos(), QUIETOS_MS));
  latidos.forEach((l) => l.unref?.());
  setTimeout(() => conCandado(() => publicarRelampagos()).catch(() => {}), 2_000).unref?.();
}

export function apagar() {
  while (latidos.length) clearInterval(latidos.pop());
}

/** La sala en memoria de una mesa (para los marcadores en vivo). */
export const sala = (code) => rm?.rooms.get(code) ?? null;
export const finDePuertaDe = (t) => finDePuerta(t);
export const finDeVentanaDe = (t) => t.segundaHasta ?? t.empiezaEn + ventanaMs();

/** Deja el servicio listo sin relojes (las pruebas). */
export function conectar(servidorIo, manager) {
  io = servidorIo;
  rm = manager;
}

export const __pruebas = {
  set arranque(ms) { arranque = ms; },
  set enLinea(fn) { enLineaDePrueba = fn; },
  vistos,
  armarCuadro,
  resolverPorWalkover: (cruceId, ganador, motivo) => conCandado(() => resolverPorWalkover(cruceId, ganador, motivo))
};
