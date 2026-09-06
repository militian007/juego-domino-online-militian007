import { query } from '../config/database.js';
import * as Ranking from './Ranking.js';
import * as Desbloqueo from './Desbloqueo.js';

/**
 * El pase de batalla: experiencia, niveles y premios.
 *
 * ## Como funciona en una linea
 *
 * Jugar y cumplir misiones da EXPERIENCIA. Cada 100 de experiencia es un NIVEL,
 * y cada nivel entrega un premio. Al terminar la temporada se empieza de cero,
 * pero los premios ya ganados no se pierden nunca.
 *
 * ## Por que la experiencia no son los puntos del ranking
 *
 * Son dos cosas distintas a proposito. Los puntos del ranking dicen quien juega
 * MEJOR; la experiencia del pase dice quien juega MAS. Si fueran lo mismo, el
 * que se pasa el dia jugando le pasaria por encima al que juega mejor y la
 * tabla dejaria de significar nada.
 *
 * Por eso el pase reparte pocos puntos de ranking: es un premio simbolico, no
 * un atajo. Si Jonathan quiere que pese mas o menos, se cambian los numeros de
 * PUNTOS_POR_TRAMO y nada mas.
 */

// ------------------------------------------------------------- la temporada

/**
 * Cuando arranco la primera temporada. Es un lunes.
 *
 * Todo lo demas se calcula desde aqui, asi que no hace falta una tabla de
 * temporadas ni que nadie cree la siguiente a mano: el dia que termina la T1
 * empieza la T2 sola.
 */
export const EPOCA = Date.UTC(2026, 7, 31);

/** Cuanto dura una temporada. Seis semanas: larga para llegar sin ahogo, corta para que no aburra. */
export const SEMANAS_POR_TEMPORADA = 6;
const MS_TEMPORADA = SEMANAS_POR_TEMPORADA * 7 * 24 * 60 * 60 * 1000;

export const NIVELES = 40;
export const XP_POR_NIVEL = 100;

/** En que temporada estamos. Devuelve "T1", "T2"... */
export const temporadaActual = (fecha = new Date()) => {
  const pasadas = Math.floor((fecha.getTime() - EPOCA) / MS_TEMPORADA);
  return `T${Math.max(0, pasadas) + 1}`;
};

/** Cuando empieza y cuando termina la temporada que corre. */
export const ventanaDeTemporada = (fecha = new Date()) => {
  const numero = Number(temporadaActual(fecha).slice(1));
  const empieza = EPOCA + (numero - 1) * MS_TEMPORADA;
  return {
    id: `T${numero}`,
    numero,
    empiezaEn: new Date(empieza).toISOString(),
    terminaEn: new Date(empieza + MS_TEMPORADA).toISOString()
  };
};

/** El dia de hoy, para las misiones diarias. */
export const diaActual = (fecha = new Date()) => fecha.toISOString().slice(0, 10);

// --------------------------------------------------------------- los premios

const puntos = (cantidad) => ({ tipo: 'puntos', cantidad, nombre: `${cantidad} puntos de club` });
const cosa = (clave, nombre) => ({ tipo: 'desbloqueo', clave, nombre });

// El sticker lleva su emoji aparte del nombre para que la pantalla lo pueda
// dibujar sin tener que adivinarlo partiendo el texto.
const sticker = (clave, emoji, nombre) => ({
  tipo: 'desbloqueo',
  clave,
  emoji,
  imagen: `/stickers/${clave.split(':')[1]}.png`,
  nombre: `Sticker ${emoji} ${nombre}`,
  corto: nombre
});

/**
 * Cuantos puntos de club da un nivel que no tiene premio propio.
 *
 * Suben con el nivel para que el final se sienta mejor que el principio.
 */
const PUNTOS_POR_TRAMO = [
  { hasta: 10, puntos: 5 },
  { hasta: 20, puntos: 8 },
  { hasta: 30, puntos: 10 },
  { hasta: 40, puntos: 12 }
];

/**
 * Los niveles que dan algo distinto a puntos.
 *
 * Estan repartidos a proposito: uno temprano para enganchar (el titulo del 5),
 * uno a mitad de camino y el gordo al final. Es como los arma todo el mundo, y
 * funciona porque el premio lejano solo motiva si por el camino hay premios
 * cerca.
 */
const ESPECIALES = {
  2: [sticker('sticker:candela', '🔥', 'Candela')],
  5: [cosa('titulo:tranquero', 'Título "Tranquero"')],
  7: [sticker('sticker:corona', '👑', 'Corona')],
  10: [cosa('pano:medianoche', 'Paño azul medianoche')],
  12: [cosa('titulo:chivo', 'Título "Chivo"')],
  15: [sticker('sticker:suerte', '🍀', 'Suerte')],
  18: [sticker('sticker:chivo', '🐐', 'El Chivo')],
  20: [cosa('titulo:matador', 'Título "Matador"')],
  22: [cosa('pano:purpura', 'Paño púrpura real')],
  25: [sticker('sticker:cerebro', '🧠', 'Cerebro')],
  28: [cosa('titulo:cabezafria', 'Título "Cabeza Fría"')],
  31: [sticker('sticker:respeto', '🫡', 'Respeto')],
  34: [cosa('pano:oroviejo', 'Paño oro viejo')],
  36: [cosa('titulo:elduro', 'Título "El Duro"')],
  38: [sticker('sticker:diamante', '💎', 'Diamante')],
  40: [cosa('fichas:oro', 'Fichas negro y oro'), puntos(100)]
};

/**
 * El pase pago.
 *
 * Esta definido pero APAGADO: en Venezuela no hay pasarela de pago todavia
 * (decision de Jonathan). Mientras el interruptor este en false, el servidor no
 * entrega nada de esta fila y la pantalla la muestra como "próximamente".
 * El dia que haya cobro, se cambia el interruptor.
 */
export const PASE_ORO_ACTIVO = false;

const premiosOro = (nivel) => {
  if (nivel === NIVELES) return [cosa('titulo:leyenda', 'Título "Leyenda"'), puntos(200)];
  const base = PUNTOS_POR_TRAMO.find((t) => nivel <= t.hasta)?.puntos ?? 5;
  return [puntos(base * 2)];
};

/** La escalera completa: que da cada nivel. */
export const PREMIOS = Array.from({ length: NIVELES }, (_, i) => {
  const nivel = i + 1;
  const base = PUNTOS_POR_TRAMO.find((t) => nivel <= t.hasta)?.puntos ?? 5;
  return {
    nivel,
    gratis: ESPECIALES[nivel] ?? [puntos(base)],
    oro: premiosOro(nivel)
  };
});

/** El nivel que corresponde a esa experiencia. Tope en el ultimo. */
export const nivelDe = (xp) => Math.min(NIVELES, Math.floor(xp / XP_POR_NIVEL));

// ------------------------------------------------------------- el progreso

const fichaVacia = (userId, temporada) => ({
  userId: Number(userId),
  temporada,
  xp: 0,
  nivel: 0,
  nivelCobrado: 0
});

const armar = (r) => ({
  userId: Number(r.user_id),
  temporada: r.temporada,
  xp: Number(r.xp),
  nivel: nivelDe(Number(r.xp)),
  nivelCobrado: Number(r.nivel_cobrado)
});

export const de = async (userId, temporada = temporadaActual()) => {
  const { rows } = await query(
    'SELECT * FROM pase_progreso WHERE user_id = ? AND temporada = ?',
    [Number(userId), temporada]
  );
  return rows[0] ? armar(rows[0]) : fichaVacia(userId, temporada);
};

/**
 * Suma experiencia y entrega lo que corresponda.
 *
 * Devuelve los niveles nuevos y los premios entregados, para poder avisarle a
 * quien lo gano. Si no subio de nivel, la lista viene vacia.
 *
 * Entregar es idempotente: `nivel_cobrado` deja anotado hasta donde se pago, y
 * los desbloqueos no se duplican aunque se intente dos veces.
 */
export const sumarXp = async (userId, cuanta, motivo = '') => {
  if (!Number.isFinite(cuanta) || cuanta <= 0) {
    const igual = await de(userId);
    return { subio: false, xp: igual.xp, nivel: igual.nivel, premios: [] };
  }

  const temporada = temporadaActual();
  const antes = await de(userId, temporada);
  const xp = antes.xp + Math.round(cuanta);
  const ahora = new Date().toISOString();

  const { rows } = await query(
    'SELECT id FROM pase_progreso WHERE user_id = ? AND temporada = ?',
    [Number(userId), temporada]
  );

  if (rows[0]) {
    await query('UPDATE pase_progreso SET xp = ?, actualizado_en = ? WHERE id = ?', [xp, ahora, rows[0].id]);
  } else {
    await query(
      'INSERT INTO pase_progreso (user_id, temporada, xp, nivel_cobrado, actualizado_en) VALUES (?, ?, ?, 0, ?)',
      [Number(userId), temporada, xp, ahora]
    );
  }

  const nivel = nivelDe(xp);
  const premios = await entregarHasta(userId, temporada, nivel);

  return { subio: nivel > antes.nivel, xp, nivel, nivelAntes: antes.nivel, premios, motivo };
};

/** Entrega los premios de todos los niveles que faltan por pagar. */
const entregarHasta = async (userId, temporada, nivel) => {
  const { rows } = await query(
    'SELECT nivel_cobrado FROM pase_progreso WHERE user_id = ? AND temporada = ?',
    [Number(userId), temporada]
  );
  const cobrado = Number(rows[0]?.nivel_cobrado ?? 0);
  if (nivel <= cobrado) return [];

  const entregados = [];
  for (let n = cobrado + 1; n <= nivel; n++) {
    const escalon = PREMIOS[n - 1];
    if (!escalon) continue;

    const lista = [...escalon.gratis, ...(PASE_ORO_ACTIVO ? escalon.oro : [])];
    for (const premio of lista) {
      if (premio.tipo === 'puntos') {
        await Ranking.sumarPuntos(userId, premio.cantidad);
      } else if (premio.tipo === 'desbloqueo') {
        await Desbloqueo.dar(userId, premio.clave);
      }
      entregados.push({ nivel: n, ...premio });
    }
  }

  await query(
    'UPDATE pase_progreso SET nivel_cobrado = ? WHERE user_id = ? AND temporada = ?',
    [nivel, Number(userId), temporada]
  );

  return entregados;
};
