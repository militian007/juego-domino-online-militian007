import { query } from '../config/database.js';

/**
 * Lo que cada jugador tiene desbloqueado.
 *
 * Pintas de fichas, paños, avatares, titulos: todo lo que se gana jugando en
 * vez de estar suelto desde el principio.
 *
 * ## Por que vive en el servidor
 *
 * Podria guardarse en el navegador, que es mas simple. No se hace: cualquiera
 * se regalaria los premios editando lo que su telefono tiene guardado, y **un
 * premio que se puede regalar no es un premio**. El servidor manda (CLAUDE.md
 * regla 8).
 *
 * ## Las claves
 *
 * Texto libre, con prefijo por tipo: `fichas:oro`, `pano:marmol`,
 * `titulo:tranquero`. Asi se agregan premios nuevos sin tocar la tabla.
 */

export const de = async (userId) => {
  const { rows } = await query(
    'SELECT clave FROM desbloqueos WHERE user_id = ?',
    [Number(userId)]
  );
  return rows.map((r) => r.clave);
};

export const tiene = async (userId, clave) => {
  const { rows } = await query(
    'SELECT id FROM desbloqueos WHERE user_id = ? AND clave = ?',
    [Number(userId), clave]
  );
  return rows.length > 0;
};

/**
 * Le da algo a alguien.
 *
 * Vuelve a darlo no rompe nada ni lo duplica: el pase de batalla puede repetir
 * el aviso sin miedo.
 *
 * @returns true si es la primera vez que lo recibe
 */
export const dar = async (userId, clave) => {
  if (await tiene(userId, clave)) return false;

  await query(
    'INSERT INTO desbloqueos (user_id, clave, obtenido_en) VALUES (?, ?, ?)',
    [Number(userId), clave, new Date().toISOString()]
  );
  return true;
};

/** Se lo quita. Solo para pruebas y para arreglar entuertos. */
export const quitar = async (userId, clave) => {
  await query('DELETE FROM desbloqueos WHERE user_id = ? AND clave = ?', [Number(userId), clave]);
};
