import { query } from '../config/database.js';

/**
 * Los ajustes de cada jugador que tienen que vivir en el servidor.
 *
 * Hoy guarda uno solo: cual de sus titulos eligio mostrar. Va aqui y no en el
 * navegador porque el titulo lo tiene que ver el RESTO de la gente, en el chat
 * y en la tabla; guardado en su telefono no lo veria nadie mas.
 *
 * No se le agregan columnas a `users` porque esa tabla ya existe en produccion y
 * el esquema se crea con CREATE TABLE IF NOT EXISTS, que no agrega columnas a
 * una tabla que ya esta.
 */

export const TITULO = 'titulo';

export const leer = async (userId, clave) => {
  const { rows } = await query(
    'SELECT valor FROM preferencias WHERE user_id = ? AND clave = ?',
    [Number(userId), clave]
  );
  return rows[0]?.valor ?? null;
};

export const guardar = async (userId, clave, valor) => {
  const ahora = new Date().toISOString();
  const { rows } = await query(
    'SELECT id FROM preferencias WHERE user_id = ? AND clave = ?',
    [Number(userId), clave]
  );

  if (rows[0]) {
    await query('UPDATE preferencias SET valor = ?, actualizado_en = ? WHERE id = ?', [
      valor,
      ahora,
      rows[0].id
    ]);
    return;
  }

  await query(
    'INSERT INTO preferencias (user_id, clave, valor, actualizado_en) VALUES (?, ?, ?, ?)',
    [Number(userId), clave, valor, ahora]
  );
};

/** Los titulos de varias personas de una sola consulta, para pintar el chat o la tabla. */
export const titulosDe = async (userIds) => {
  const ids = [...new Set(userIds.map(Number))].filter(Boolean);
  if (!ids.length) return {};

  const huecos = ids.map(() => '?').join(', ');
  const { rows } = await query(
    `SELECT user_id, valor FROM preferencias WHERE clave = ? AND user_id IN (${huecos})`,
    [TITULO, ...ids]
  );

  const salida = {};
  for (const r of rows) if (r.valor) salida[Number(r.user_id)] = r.valor;
  return salida;
};
