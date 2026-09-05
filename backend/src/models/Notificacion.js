import { query } from '../config/database.js';

/** Cuantas se le muestran a alguien de una vez. */
export const CUANTAS = 30;

/** A partir de cuantas guardadas por persona se borran las mas viejas. */
const TOPE_POR_PERSONA = 100;

/**
 * Los tipos que existen hoy.
 *
 * `torneo` esta previsto pero todavia no lo usa nadie: los torneos no estan
 * hechos. Cuando se hagan, solo tienen que escribir una fila aqui.
 */
export const TIPO = {
  RETO: 'reto',
  RETO_ACEPTADO: 'reto-aceptado',
  RETO_RECHAZADO: 'reto-rechazado',
  RETO_VENCIDO: 'reto-vencido',
  TORNEO: 'torneo'
};

const armar = (r) => ({
  id: r.id,
  tipo: r.tipo,
  titulo: r.titulo,
  cuerpo: r.cuerpo,
  datos: r.datos ? JSON.parse(r.datos) : null,
  leida: Boolean(Number(r.leida)),
  creadaEn: r.creada_en
});

export const crear = async ({ userId, tipo, titulo, cuerpo = null, datos = null }) => {
  // La fecha va explicita y en ISO por lo mismo que en el chat: no depender de
  // como quedo escrito el valor por defecto de la tabla en cada base.
  const cuando = new Date().toISOString();

  const { rows } = await query(
    `INSERT INTO notificaciones (user_id, tipo, titulo, cuerpo, datos, leida, creada_en)
     VALUES (?, ?, ?, ?, ?, 0, ?) RETURNING id`,
    [Number(userId), tipo, titulo, cuerpo, datos ? JSON.stringify(datos) : null, cuando]
  );

  return {
    id: rows[0]?.id,
    tipo,
    titulo,
    cuerpo,
    datos,
    leida: false,
    creadaEn: cuando
  };
};

export const deUsuario = async (userId) => {
  const { rows } = await query(
    'SELECT id, tipo, titulo, cuerpo, datos, leida, creada_en FROM notificaciones WHERE user_id = ? ORDER BY id DESC LIMIT ?',
    [Number(userId), CUANTAS]
  );
  return rows.map(armar);
};

export const sinLeer = async (userId) => {
  const { rows } = await query(
    'SELECT COUNT(*) AS n FROM notificaciones WHERE user_id = ? AND leida = 0',
    [Number(userId)]
  );
  return Number(rows[0]?.n ?? 0);
};

export const marcarTodasLeidas = async (userId) => {
  await query('UPDATE notificaciones SET leida = 1 WHERE user_id = ? AND leida = 0', [Number(userId)]);
};

/**
 * Borra lo viejo de una persona.
 *
 * Un buzon sin limite crece para siempre, y nadie baja cien avisos hacia atras.
 */
export const podar = async (userId) => {
  await query(
    `DELETE FROM notificaciones
     WHERE user_id = ?
       AND id <= (SELECT MAX(id) FROM notificaciones WHERE user_id = ?) - ?`,
    [Number(userId), Number(userId), TOPE_POR_PERSONA]
  );
};
