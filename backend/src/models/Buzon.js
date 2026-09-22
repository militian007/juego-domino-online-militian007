import { query } from '../config/database.js';

/**
 * EL BUZON DE IDEAS Y FALLAS (seccion 200, copiado del truco; Raul: «buzon de
 * una, todas deben tenerlo»). Una nota por renglon: idea o falla, quien la
 * dejo (identidad ligera o cuenta, id de texto), en que pantalla estaba, y el
 * texto. Nadie contesta: no es un ticket. El socio copia lo nuevo y lo pega
 * en el chat de Claude; de ahi salen los arreglos.
 */
export const LARGO_MAXIMO = 600;

export const guardar = async ({ tipo, userId, username, pantalla, texto }) => {
  const cuando = new Date().toISOString();
  const { rows } = await query(
    'INSERT INTO buzon (tipo, user_id, username, pantalla, texto, creado_en) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    [tipo === 'falla' ? 'falla' : 'idea', String(userId), username, pantalla ?? null, texto, cuando]
  );
  return { id: rows[0]?.id, tipo, userId: String(userId), username, pantalla, texto, creadoEn: cuando };
};

/** Todas las notas, de la mas vieja a la mas nueva; `desde` deja solo lo posterior a esa fecha. */
export const listar = async (desde = null) => {
  const { rows } = desde
    ? await query('SELECT id, tipo, user_id, username, pantalla, texto, creado_en FROM buzon WHERE creado_en > ? ORDER BY id', [desde])
    : await query('SELECT id, tipo, user_id, username, pantalla, texto, creado_en FROM buzon ORDER BY id', []);
  return rows.map((r) => ({ id: r.id, tipo: r.tipo, userId: String(r.user_id), username: r.username, pantalla: r.pantalla, texto: r.texto, creadoEn: r.creado_en }));
};

/** Cuantas dejo esta persona en la ultima hora (freno contra el que machaca). */
export const recientesDe = async (userId) => {
  const hace = new Date(Date.now() - 3600_000).toISOString();
  const { rows } = await query('SELECT COUNT(*) AS n FROM buzon WHERE user_id = ? AND creado_en > ?', [String(userId), hace]);
  return Number(rows[0]?.n ?? 0);
};

export const vaciar = async () => {
  await query('DELETE FROM buzon', []);
};

// La fecha de la ultima copia vive en la base (no en el navegador del socio):
// asi "lo nuevo" es lo nuevo desde cualquier maquina.
export const ultimaCopia = async () => {
  const { rows } = await query("SELECT valor FROM buzon_marcas WHERE clave = 'ultima_copia'", []);
  return rows[0]?.valor ?? null;
};

export const marcarCopia = async () => {
  const ahora = new Date().toISOString();
  await query("INSERT INTO buzon_marcas (clave, valor) VALUES ('ultima_copia', ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor", [ahora]);
  return ahora;
};
