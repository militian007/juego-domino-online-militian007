import { query } from '../config/database.js';

/**
 * Los torneos, con la misma forma que los de PrivoyTruco.
 *
 * Ahi son "El Relampago": uno cada media hora, gratis, te anotas, se arma la
 * llave y el que gana se lleva el pozo. Aca es igual **menos la plata**: el
 * premio son puntos de clasificacion y una copa que queda en el palmares.
 * Decision de Jonathan, porque todavia no hay pasarela de pago.
 *
 * Este archivo solo habla con la base. Quien crea los torneos, los arranca y
 * lleva la llave es `services/torneos.js`.
 */

export const ESTADO = {
  ANUNCIADO: 'anunciado',
  JUGANDO: 'jugando',
  TERMINADO: 'terminado',
  CANCELADO: 'cancelado'
};

const armar = (r) => ({
  id: Number(r.id),
  nombre: r.nombre,
  empiezaEn: r.empieza_en,
  estado: r.estado,
  premioPuntos: Number(r.premio_puntos),
  campeonId: r.campeon_id == null ? null : Number(r.campeon_id),
  campeon: r.campeon ?? null,
  anotados: r.anotados == null ? 0 : Number(r.anotados),
  terminadoEn: r.terminado_en ?? null
});

/** El trozo de consulta que cuenta los anotados, para no repetirlo. */
const CON_ANOTADOS = `
  SELECT t.*, (SELECT COUNT(*) FROM torneo_inscritos i WHERE i.torneo_id = t.id) AS anotados
  FROM torneos t`;

export const crear = async ({ nombre, empiezaEn, premioPuntos }) => {
  const { rows } = await query(
    'INSERT INTO torneos (nombre, empieza_en, estado, premio_puntos) VALUES (?, ?, ?, ?) RETURNING id',
    [nombre, empiezaEn, ESTADO.ANUNCIADO, premioPuntos]
  );
  return Number(rows[0]?.id);
};

/** ¿Ya existe un torneo que empiece a esa hora exacta? */
export const hayAEsaHora = async (empiezaEn) => {
  const { rows } = await query('SELECT id FROM torneos WHERE empieza_en = ?', [empiezaEn]);
  return rows.length > 0;
};

/** Los que todavia no empezaron, del mas proximo al mas lejano. */
export const proximos = async (cuantos = 10) => {
  const { rows } = await query(
    `${CON_ANOTADOS} WHERE t.estado = ? ORDER BY t.empieza_en ASC LIMIT ?`,
    [ESTADO.ANUNCIADO, Math.min(Math.max(Number(cuantos) || 10, 1), 50)]
  );
  return rows.map(armar);
};

/** Los que ya deberian haber arrancado. */
export const paraArrancar = async (ahora) => {
  const { rows } = await query(
    `${CON_ANOTADOS} WHERE t.estado = ? AND t.empieza_en <= ? ORDER BY t.empieza_en ASC`,
    [ESTADO.ANUNCIADO, ahora]
  );
  return rows.map(armar);
};

export const porId = async (id) => {
  const { rows } = await query(`${CON_ANOTADOS} WHERE t.id = ?`, [Number(id)]);
  return rows[0] ? armar(rows[0]) : null;
};

export const cambiarEstado = async (id, estado) => {
  await query('UPDATE torneos SET estado = ? WHERE id = ?', [estado, Number(id)]);
};

export const coronar = async (id, campeonId) => {
  await query(
    'UPDATE torneos SET estado = ?, campeon_id = ?, terminado_en = ? WHERE id = ?',
    [ESTADO.TERMINADO, campeonId == null ? null : Number(campeonId), new Date().toISOString(), Number(id)]
  );
};

// ------------------------------------------------------------ inscritos

/**
 * Anota a alguien.
 *
 * Devuelve false si ya estaba: el indice unico lo impide, y avisar es mejor
 * que reventar.
 */
export const anotar = async (torneoId, userId) => {
  const yaEsta = await estaAnotado(torneoId, userId);
  if (yaEsta) return false;

  await query(
    'INSERT INTO torneo_inscritos (torneo_id, user_id) VALUES (?, ?)',
    [Number(torneoId), Number(userId)]
  );
  return true;
};

export const borrarse = async (torneoId, userId) => {
  await query(
    'DELETE FROM torneo_inscritos WHERE torneo_id = ? AND user_id = ?',
    [Number(torneoId), Number(userId)]
  );
};

export const estaAnotado = async (torneoId, userId) => {
  const { rows } = await query(
    'SELECT id FROM torneo_inscritos WHERE torneo_id = ? AND user_id = ?',
    [Number(torneoId), Number(userId)]
  );
  return rows.length > 0;
};

/** Los que siguen vivos en la llave. */
export const enPie = async (torneoId) => {
  const { rows } = await query(
    `SELECT i.user_id, i.ronda, u.username
     FROM torneo_inscritos i JOIN users u ON u.id = i.user_id
     WHERE i.torneo_id = ? AND i.eliminado = 0
     ORDER BY i.id ASC`,
    [Number(torneoId)]
  );
  return rows.map((r) => ({ userId: Number(r.user_id), username: r.username, ronda: Number(r.ronda) }));
};

export const eliminar = async (torneoId, userId) => {
  await query(
    'UPDATE torneo_inscritos SET eliminado = 1 WHERE torneo_id = ? AND user_id = ?',
    [Number(torneoId), Number(userId)]
  );
};

export const pasarDeRonda = async (torneoId, userId, ronda) => {
  await query(
    'UPDATE torneo_inscritos SET ronda = ? WHERE torneo_id = ? AND user_id = ?',
    [Number(ronda), Number(torneoId), Number(userId)]
  );
};

/** En que torneos esta anotado alguien, de los que no empezaron. */
export const misProximos = async (userId) => {
  const { rows } = await query(
    `SELECT t.id FROM torneos t
     JOIN torneo_inscritos i ON i.torneo_id = t.id
     WHERE i.user_id = ? AND t.estado = ?`,
    [Number(userId), ESTADO.ANUNCIADO]
  );
  return rows.map((r) => Number(r.id));
};

// ------------------------------------------------------------ palmares

/** Los ultimos campeones. Es "EL PALMARES" de PrivoyTruco. */
export const palmares = async (cuantos = 10) => {
  const { rows } = await query(
    `SELECT t.id, t.nombre, t.premio_puntos, t.terminado_en, u.username AS campeon, t.campeon_id
     FROM torneos t JOIN users u ON u.id = t.campeon_id
     WHERE t.estado = ? AND t.campeon_id IS NOT NULL
     ORDER BY t.terminado_en DESC
     LIMIT ?`,
    [ESTADO.TERMINADO, Math.min(Math.max(Number(cuantos) || 10, 1), 100)]
  );

  return rows.map((r) => ({
    torneoId: Number(r.id),
    nombre: r.nombre,
    campeonId: Number(r.campeon_id),
    campeon: r.campeon,
    premioPuntos: Number(r.premio_puntos),
    terminadoEn: r.terminado_en
  }));
};

/** Cuantas copas tiene cada uno. Es la vista "Torneos" de la clasificacion. */
export const tablaDeCopas = async (cuantos = 100) => {
  const { rows } = await query(
    `SELECT t.campeon_id AS user_id, u.username, COUNT(*) AS copas,
            r.ganadas, r.partidas
     FROM torneos t
     JOIN users u ON u.id = t.campeon_id
     LEFT JOIN ranking r ON r.user_id = t.campeon_id
     WHERE t.estado = ? AND t.campeon_id IS NOT NULL
     GROUP BY t.campeon_id, u.username, r.ganadas, r.partidas
     ORDER BY copas DESC, r.ganadas DESC
     LIMIT ?`,
    [ESTADO.TERMINADO, Math.min(Math.max(Number(cuantos) || 100, 1), 500)]
  );

  return rows.map((r, i) => ({
    puesto: i + 1,
    userId: Number(r.user_id),
    username: r.username,
    copas: Number(r.copas),
    ganadas: Number(r.ganadas ?? 0),
    partidas: Number(r.partidas ?? 0)
  }));
};

/** Cuantas copas tiene una persona, para su perfil. */
export const copasDe = async (userId) => {
  const { rows } = await query(
    'SELECT COUNT(*) AS n FROM torneos WHERE campeon_id = ? AND estado = ?',
    [Number(userId), ESTADO.TERMINADO]
  );
  return Number(rows[0]?.n ?? 0);
};
