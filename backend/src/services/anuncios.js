import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import * as Preferencia from '../models/Preferencia.js';

/**
 * LOS ANUNCIOS DE LA CASA (seccion 214), copiados del truco
 * (`lib/anuncios/anuncios.ts`, Raul 2026-08-15: «vamos a construir una opcion
 * para yo poder dar anuncios y les salga una vez a los jugadores»).
 *
 * Un anuncio vivo a la vez; publicar reemplaza al anterior y estrena id, y el
 * id ES la marca de «ya lo vio». Las reglas (ventana, publico, veces) son las
 * del truco, sin cambiar una.
 *
 * Las tres trampas del truco, respetadas:
 * 1. La marca va en dos campos propios que se PISAN con el id de turno y nunca
 *    crecen (aqui, dos claves de `preferencias`; en el invitado, una sola
 *    llave del telefono).
 * 2. Nada pisa esas marcas de rebote: cada una es su propia fila.
 * 3. La marca se pone AL CERRARLO, no al mostrarlo (la pantalla la manda).
 *
 * El estado de la lista (activo, programado, vencido, bajado) NO se guarda: se
 * calcula al leer, porque depende de la hora.
 */

export const FORMAS = ['sobre', 'pizarra', 'casa'];
export const PUBLICOS = ['todos', 'cuenta', 'invitados'];
export const VECES = ['una', 'siempre', 'recordar'];
export const HISTORIAL_TOPE = 30;

export const MARCA_VISTO = 'anuncio.visto';
export const MARCA_RECORDADO = 'anuncio.recordado';

/* ------------------------------------------------------------ las reglas */

export function estaVigente(a, ahora = new Date()) {
  const desde = new Date(a.desde).getTime();
  if (Number.isNaN(desde) || ahora.getTime() < desde) return false;
  if (a.hasta === null || a.hasta === undefined) return true;
  const hasta = new Date(a.hasta).getTime();
  return !Number.isNaN(hasta) && ahora.getTime() <= hasta;
}

/** En el domino el invitado es el que no tiene cuenta (identidad ligera). */
export function alcanzaAlJugador(a, { invitado }) {
  if (a.publico === 'todos') return true;
  if (a.publico === 'cuenta') return !invitado;
  return Boolean(invitado);
}

/**
 * Que le toca ver a este jugador, o null: fuera de ventana, no es su publico,
 * o ya lo vio las veces que correspondia. `jugador` = { invitado, visto, recordado }.
 */
export function loQueLeToca(a, jugador, ahora = new Date()) {
  if (!a || !estaVigente(a, ahora)) return null;
  if (!alcanzaAlJugador(a, jugador)) return null;

  const yaLoVio = jugador.visto === a.id;
  const base = { id: a.id, titulo: a.titulo, cuerpo: a.cuerpo, forma: a.forma, eventoAt: a.eventoAt ?? null };

  if (a.veces === 'siempre') return { ...base, motivo: 'vista' };
  if (!yaLoVio) return { ...base, motivo: 'vista' };

  if (a.veces !== 'recordar' || jugador.recordado === a.id) return null;
  if (!a.eventoAt || !a.recordarMin) return null;
  const evento = new Date(a.eventoAt).getTime();
  if (Number.isNaN(evento)) return null;
  const faltan = evento - ahora.getTime();
  if (faltan <= 0 || faltan > a.recordarMin * 60_000) return null;
  return { ...base, motivo: 'recordatorio' };
}

export function estadoDe(h, ahora = new Date()) {
  if (h.bajadoAt) return 'bajado';
  const desde = new Date(h.desde).getTime();
  if (!Number.isNaN(desde) && ahora.getTime() < desde) return 'programado';
  if (h.hasta) {
    const hasta = new Date(h.hasta).getTime();
    if (!Number.isNaN(hasta) && ahora.getTime() > hasta) return 'vencido';
  }
  return 'activo';
}

const esFecha = (v) => typeof v === 'string' && !Number.isNaN(new Date(v).getTime());

/** Lo que el socio escribio, validado como el zod del truco. Devuelve { error } o { datos }. */
export function validar(body = {}) {
  const titulo = String(body.titulo ?? '').trim();
  const cuerpo = String(body.cuerpo ?? '').trim();
  if (!titulo || titulo.length > 80) return { error: 'El título va de 1 a 80 letras.' };
  if (!cuerpo || cuerpo.length > 600) return { error: 'El anuncio va de 1 a 600 letras.' };
  if (!FORMAS.includes(body.forma)) return { error: 'Falta por dónde le llega.' };
  if (!PUBLICOS.includes(body.publico)) return { error: 'Falta a quién.' };
  if (!VECES.includes(body.veces)) return { error: 'Falta cuántas veces.' };
  for (const k of ['desde', 'hasta', 'eventoAt']) {
    if (body[k] !== undefined && body[k] !== null && !esFecha(body[k])) return { error: 'Una de las fechas no se entiende.' };
  }
  let recordarMin = null;
  if (body.recordarMin !== undefined && body.recordarMin !== null) {
    recordarMin = Number(body.recordarMin);
    if (!Number.isInteger(recordarMin) || recordarMin < 1 || recordarMin > 1440) return { error: 'Los minutos del recordatorio no se entienden.' };
  }
  if (body.veces === 'recordar' && !(recordarMin && body.eventoAt)) {
    return { error: 'Para recordar hace falta la hora del evento y cuántos minutos antes avisar.' };
  }
  return {
    datos: {
      titulo,
      cuerpo,
      forma: body.forma,
      publico: body.publico,
      desde: body.desde ? new Date(body.desde).toISOString() : new Date().toISOString(),
      hasta: body.hasta ? new Date(body.hasta).toISOString() : null,
      veces: body.veces,
      recordarMin,
      eventoAt: body.eventoAt ? new Date(body.eventoAt).toISOString() : null
    }
  };
}

/* ------------------------------------------------------------ la base */

function deFila(fila) {
  let a;
  try {
    a = JSON.parse(fila.datos);
  } catch {
    return null;
  }
  if (!a || typeof a !== 'object' || !FORMAS.includes(a.forma) || !PUBLICOS.includes(a.publico) || !VECES.includes(a.veces)) return null;
  return { ...a, id: fila.id, bajadoAt: fila.bajado_at || null, bajadoPor: fila.bajado_por || null };
}

/** El anuncio vivo (el ultimo sin bajar), vigente o no. */
export async function anuncioGuardado() {
  const { rows } = await query('SELECT id, datos, bajado_at, bajado_por FROM anuncios WHERE bajado_at IS NULL ORDER BY n DESC LIMIT 1');
  if (!rows[0]) return null;
  const a = deFila(rows[0]);
  if (!a) return null;
  const { bajadoAt, bajadoPor, ...anuncio } = a;
  return anuncio;
}

/**
 * Publica (o reemplaza). El anterior queda BAJADO en ese instante aunque nadie
 * lo toque: si no, la lista diria «activo» de uno que ya nadie ve.
 */
export async function publicarAnuncio(datos, quien = 'socio', ahora = new Date()) {
  const anuncio = { id: randomUUID(), ...datos, creadoPor: quien, creadoAt: ahora.toISOString() };
  await query('UPDATE anuncios SET bajado_at = ?, bajado_por = ? WHERE bajado_at IS NULL', [ahora.toISOString(), quien]);
  await query('INSERT INTO anuncios (id, datos) VALUES (?, ?)', [anuncio.id, JSON.stringify(anuncio)]);
  await query(`DELETE FROM anuncios WHERE n NOT IN (SELECT n FROM (SELECT n FROM anuncios ORDER BY n DESC LIMIT ${HISTORIAL_TOPE}) AS ultimos)`);
  return anuncio;
}

/** Lo baja. No borra marcas: si se vuelve a publicar, el id es otro. */
export async function bajarAnuncio(quien = 'socio', ahora = new Date()) {
  const vivo = await anuncioGuardado();
  if (vivo) await query('UPDATE anuncios SET bajado_at = ?, bajado_por = ? WHERE id = ?', [ahora.toISOString(), quien, vivo.id]);
  return vivo;
}

/** La lista del socio, del mas nuevo al mas viejo, con el estado puesto al leer. */
export async function historialDeAnuncios(ahora = new Date()) {
  const { rows } = await query(`SELECT id, datos, bajado_at, bajado_por FROM anuncios ORDER BY n DESC LIMIT ${HISTORIAL_TOPE}`);
  return rows.map(deFila).filter(Boolean).map((h) => ({ ...h, estado: estadoDe(h, ahora) }));
}

/* ------------------------------------------------------------ las marcas de la cuenta */

export async function marcasDe(userId) {
  const [visto, recordado] = await Promise.all([
    Preferencia.leer(userId, MARCA_VISTO),
    Preferencia.leer(userId, MARCA_RECORDADO)
  ]);
  return { visto, recordado };
}

export async function marcarVisto(userId, anuncioId, tipo = 'vista') {
  await Preferencia.guardar(userId, tipo === 'recordatorio' ? MARCA_RECORDADO : MARCA_VISTO, String(anuncioId).slice(0, 64));
}
