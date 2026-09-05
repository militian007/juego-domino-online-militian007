import { query } from '../config/database.js';
import * as Pase from './Pase.js';
import * as Desbloqueo from './Desbloqueo.js';
import { semanaActual } from './Ranking.js';

/**
 * Las misiones del pase de batalla.
 *
 * Hay tres clases:
 *
 * - **diarias**: tres cada dia, se renuevan a medianoche.
 * - **semanales**: tres cada semana, valen mas.
 * - **de temporada**: las mismas las seis semanas, son las gordas.
 *
 * ## Todos tienen las mismas misiones el mismo dia
 *
 * Cuales tocan hoy se sortea a partir de la FECHA, no de la persona. Es a
 * proposito: si a cada uno le tocaran misiones distintas, nadie podria hablar de
 * ellas en el chat. Asi el sorteo es el mismo para todos y no hace falta
 * guardar en ningun lado que le toco a quien: se vuelve a calcular igual.
 */

/**
 * Las misiones posibles.
 *
 * `evento` es lo que las hace avanzar. Los eventos los dispara el servidor
 * cuando pasan cosas de verdad (una partida que termina, un torneo que se gana,
 * un amigo que llega), nunca el cliente: si los mandara el telefono, cualquiera
 * se completaria las misiones sin jugar.
 */
export const CATALOGO = [
  // ---- diarias ----
  { clave: 'd-jugar-2', clase: 'diaria', texto: 'Jugá 2 partidas', evento: 'partida', meta: 2, xp: 20 },
  { clave: 'd-ganar-1', clase: 'diaria', texto: 'Ganá 1 partida', evento: 'victoria', meta: 1, xp: 30 },
  { clave: 'd-personas', clase: 'diaria', texto: 'Ganale a una persona, no al bot', evento: 'victoria-personas', meta: 1, xp: 40 },
  { clave: 'd-pareja', clase: 'diaria', texto: 'Jugá una partida en pareja', evento: 'partida-2v2', meta: 1, xp: 25 },
  { clave: 'd-chat', clase: 'diaria', texto: 'Saludá en el chat global', evento: 'mensaje-chat', meta: 1, xp: 15 },
  { clave: 'd-torneo', clase: 'diaria', texto: 'Jugá un torneo', evento: 'torneo-jugado', meta: 1, xp: 40 },
  { clave: 'd-paliza', clase: 'diaria', texto: 'Ganá dejando al rival en menos de 30', evento: 'paliza', meta: 1, xp: 45 },

  // ---- semanales ----
  { clave: 's-jugar-10', clase: 'semanal', texto: 'Jugá 10 partidas', evento: 'partida', meta: 10, xp: 100 },
  { clave: 's-ganar-5', clase: 'semanal', texto: 'Ganá 5 partidas', evento: 'victoria', meta: 5, xp: 130 },
  { clave: 's-personas-5', clase: 'semanal', texto: 'Ganale 5 veces a personas', evento: 'victoria-personas', meta: 5, xp: 160 },
  { clave: 's-torneos-2', clase: 'semanal', texto: 'Jugá 2 torneos', evento: 'torneo-jugado', meta: 2, xp: 120 },
  { clave: 's-torneo-ganar', clase: 'semanal', texto: 'Ganá un torneo', evento: 'torneo-ganado', meta: 1, xp: 200 },

  // ---- de temporada ----
  // La de los panas es la mas gorda de todas a proposito: es la unica que hace
  // crecer el juego. Siete niveles y medio de golpe, y ademas un titulo.
  {
    clave: 't-panas',
    clase: 'temporada',
    texto: 'Traé 3 panas: que se registren con tu link y jueguen su primera partida',
    evento: 'amigo-confirmado',
    meta: 3,
    xp: 300,
    premio: { tipo: 'desbloqueo', clave: 'titulo:padrino', nombre: 'Título "Padrino"' }
  },
  { clave: 't-veterano', clase: 'temporada', texto: 'Jugá 100 partidas en la temporada', evento: 'partida', meta: 100, xp: 400 },
  { clave: 't-campeon', clase: 'temporada', texto: 'Ganá 30 partidas en la temporada', evento: 'victoria', meta: 30, xp: 400 }
];

const POR_CLAVE = new Map(CATALOGO.map((m) => [m.clave, m]));

export const CUANTAS_DIARIAS = 3;
export const CUANTAS_SEMANALES = 3;

// ------------------------------------------------------- el sorteo del dia

/** Un numero estable a partir de un texto (FNV-1a). Mismo texto, mismo numero, siempre. */
const semillaDe = (texto) => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

/** Saca `cuantas` de la lista, sin repetir, de forma que siempre salgan las mismas para esa semilla. */
const sortear = (lista, cuantas, semilla) => {
  const quedan = [...lista];
  const salen = [];
  let s = semilla || 1;
  while (salen.length < cuantas && quedan.length) {
    // Congruencial simple: alcanza de sobra para elegir tres misiones.
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    salen.push(quedan.splice(s % quedan.length, 1)[0]);
  }
  return salen;
};

/** El periodo al que pertenece cada clase de mision. */
export const periodoDe = (clase, fecha = new Date()) => {
  if (clase === 'diaria') return Pase.diaActual(fecha);
  if (clase === 'semanal') return semanaActual(fecha);
  return Pase.temporadaActual(fecha);
};

/** Las misiones que estan activas ahora mismo, sin el progreso de nadie. */
export const activas = (fecha = new Date()) => {
  const dia = Pase.diaActual(fecha);
  const semana = semanaActual(fecha);

  const diarias = sortear(
    CATALOGO.filter((m) => m.clase === 'diaria'),
    CUANTAS_DIARIAS,
    semillaDe(`dia:${dia}`)
  );
  const semanales = sortear(
    CATALOGO.filter((m) => m.clase === 'semanal'),
    CUANTAS_SEMANALES,
    semillaDe(`semana:${semana}`)
  );
  const deTemporada = CATALOGO.filter((m) => m.clase === 'temporada');

  return [...diarias, ...semanales, ...deTemporada].map((m) => ({
    ...m,
    periodo: periodoDe(m.clase, fecha)
  }));
};

// ---------------------------------------------------------- el progreso

/** Lee un contador cualquiera. Sirve para las misiones y para el tope diario de los bots. */
export const contador = async (userId, clave, periodo) => {
  const { rows } = await query(
    'SELECT progreso, cobrada FROM pase_misiones WHERE user_id = ? AND clave = ? AND periodo = ?',
    [Number(userId), clave, periodo]
  );
  return {
    progreso: Number(rows[0]?.progreso ?? 0),
    cobrada: Boolean(Number(rows[0]?.cobrada ?? 0))
  };
};

/** Suma a un contador y devuelve como quedo. */
export const sumarContador = async (userId, clave, periodo, cuanto) => {
  const { rows } = await query(
    'SELECT id, progreso FROM pase_misiones WHERE user_id = ? AND clave = ? AND periodo = ?',
    [Number(userId), clave, periodo]
  );

  if (rows[0]) {
    const nuevo = Number(rows[0].progreso) + cuanto;
    await query('UPDATE pase_misiones SET progreso = ? WHERE id = ?', [nuevo, rows[0].id]);
    return nuevo;
  }

  await query(
    'INSERT INTO pase_misiones (user_id, clave, periodo, progreso, cobrada) VALUES (?, ?, ?, ?, 0)',
    [Number(userId), clave, periodo, cuanto]
  );
  return cuanto;
};

const marcarCobrada = async (userId, clave, periodo) => {
  await query(
    'UPDATE pase_misiones SET cobrada = 1 WHERE user_id = ? AND clave = ? AND periodo = ?',
    [Number(userId), clave, periodo]
  );
};

/**
 * Hace avanzar todas las misiones activas que escuchan ese evento.
 *
 * Devuelve las que se completaron con esta jugada, ya pagadas, para poder
 * avisarle al jugador.
 */
export const avanzar = async (userId, evento, cuanto = 1) => {
  if (!userId || cuanto <= 0) return [];

  const completadas = [];

  for (const mision of activas()) {
    if (mision.evento !== evento) continue;

    const antes = await contador(userId, mision.clave, mision.periodo);
    if (antes.cobrada) continue;

    const progreso = await sumarContador(userId, mision.clave, mision.periodo, cuanto);
    if (progreso < mision.meta) continue;

    await marcarCobrada(userId, mision.clave, mision.periodo);
    // Algunas misiones dan ademas una cosa, no solo experiencia.
    if (mision.premio?.tipo === 'desbloqueo') await Desbloqueo.dar(userId, mision.premio.clave);
    const resultado = await Pase.sumarXp(userId, mision.xp, `mision:${mision.clave}`);
    completadas.push({ ...mision, progreso, resultado });
  }

  return completadas;
};

/** Como va cada mision activa de esa persona. Es lo que pinta la pantalla. */
export const estadoDe = async (userId) => {
  const lista = activas();
  const salida = [];

  for (const mision of lista) {
    const { progreso, cobrada } = userId
      ? await contador(userId, mision.clave, mision.periodo)
      : { progreso: 0, cobrada: false };

    salida.push({
      clave: mision.clave,
      clase: mision.clase,
      texto: mision.texto,
      meta: mision.meta,
      xp: mision.xp,
      premio: mision.premio ?? null,
      progreso: Math.min(progreso, mision.meta),
      hecha: cobrada
    });
  }

  return salida;
};

export const porClave = (clave) => POR_CLAVE.get(clave) ?? null;
