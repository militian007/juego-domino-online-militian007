import { query } from '../config/database.js';

/**
 * Quien trajo a quien.
 *
 * ## El codigo de invitacion es el propio nombre de usuario
 *
 * No se inventa un codigo aparte ni hace falta una tabla para guardarlo: los
 * nombres ya son unicos y no se repiten. El link queda
 * `.../register?ref=Jonathan`, que se entiende de una y se dicta por telefono
 * sin equivocarse, cosa que un codigo tipo "K7X2QF" no.
 *
 * ## Se confirma jugando, no registrandose
 *
 * La fila nace sin confirmar. Se confirma cuando el invitado TERMINA su primera
 * partida. Si contara el registro, cualquiera se crea diez cuentas de mentira y
 * cobra la mision de los panas sin traer a nadie.
 */

/** Anota que a alguien lo trajo otro. Devuelve false si no corresponde. */
export const registrar = async (nombreDelInvitador, invitadoId) => {
  if (!nombreDelInvitador || !invitadoId) return false;

  const { rows: quien } = await query('SELECT id FROM users WHERE username = ?', [
    String(nombreDelInvitador).trim()
  ]);
  const invitadorId = Number(quien[0]?.id ?? 0);
  if (!invitadorId) return false;

  // Nadie se invita a si mismo.
  if (invitadorId === Number(invitadoId)) return false;

  // Un invitado tiene un solo padrino, el primero.
  const { rows: yaTiene } = await query('SELECT id FROM invitaciones WHERE invitado_id = ?', [
    Number(invitadoId)
  ]);
  if (yaTiene[0]) return false;

  await query(
    'INSERT INTO invitaciones (invitador_id, invitado_id, confirmada, creada_en) VALUES (?, ?, 0, ?)',
    [invitadorId, Number(invitadoId), new Date().toISOString()]
  );
  return true;
};

/**
 * Marca que el invitado ya jugo.
 *
 * @returns el id de quien lo trajo, pero SOLO la primera vez. Asi quien llama
 *   puede pagarle la mision sin miedo a pagarla dos veces.
 */
export const confirmar = async (invitadoId) => {
  const { rows } = await query(
    'SELECT id, invitador_id, confirmada FROM invitaciones WHERE invitado_id = ?',
    [Number(invitadoId)]
  );
  const fila = rows[0];
  if (!fila || Number(fila.confirmada) === 1) return null;

  await query('UPDATE invitaciones SET confirmada = 1, confirmada_en = ? WHERE id = ?', [
    new Date().toISOString(),
    fila.id
  ]);
  return Number(fila.invitador_id);
};

/** Los panas que trajo alguien, con nombre y si ya jugaron. */
export const deInvitador = async (userId) => {
  const { rows } = await query(
    `SELECT i.invitado_id, i.confirmada, i.creada_en, u.username
       FROM invitaciones i
       JOIN users u ON u.id = i.invitado_id
      WHERE i.invitador_id = ?
      ORDER BY i.id DESC`,
    [Number(userId)]
  );
  return rows.map((r) => ({
    userId: Number(r.invitado_id),
    username: r.username,
    jugo: Boolean(Number(r.confirmada)),
    creadaEn: r.creada_en
  }));
};

/** Cuantos de los que trajo ya jugaron. */
export const confirmados = async (userId) => {
  const { rows } = await query(
    'SELECT COUNT(*) AS n FROM invitaciones WHERE invitador_id = ? AND confirmada = 1',
    [Number(userId)]
  );
  return Number(rows[0]?.n ?? 0);
};
