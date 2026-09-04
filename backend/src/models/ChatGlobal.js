import { query } from '../config/database.js';

/** Lo mas largo que puede ser un mensaje. Mas que esto es un panfleto. */
export const LARGO_MAXIMO = 300;

/** Cuantos mensajes viejos ve el que entra al menu. */
export const HISTORIAL = 40;

/** A partir de cuantos mensajes guardados se empiezan a borrar los mas viejos. */
const TOPE_GUARDADO = 500;

/**
 * Deja el texto listo para guardar.
 *
 * No se escapa HTML aca a proposito: React escapa solo al pintar, y escapar dos
 * veces haria que alguien que escribe "5 < 6" vea "5 &lt; 6" en pantalla. Lo que
 * si se saca son los caracteres de control invisibles, que sirven para romper el
 * dibujo de la lista o para hacerse pasar por otro.
 *
 * @returns {string|null} el texto limpio, o null si no queda nada que decir
 */
export const limpiar = (texto) => {
  if (typeof texto !== 'string') return null;

  const limpio = texto
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LARGO_MAXIMO);

  return limpio.length > 0 ? limpio : null;
};

export const guardar = async ({ userId, username, texto }) => {
  // La fecha se manda desde aca en vez de dejarsela al valor por defecto de la
  // tabla. Asi da igual como haya quedado escrita la tabla en cada base, y el
  // formato es siempre el mismo: ISO, que el navegador entiende sin traducir.
  const cuando = new Date().toISOString();

  const { rows } = await query(
    'INSERT INTO chat_global (user_id, username, texto, creado_en) VALUES (?, ?, ?, ?) RETURNING id',
    [Number(userId), username, texto, cuando]
  );

  return {
    id: rows[0]?.id,
    userId: Number(userId),
    username,
    texto,
    creadoEn: cuando
  };
};

export const ultimos = async (cuantos = HISTORIAL) => {
  const tope = Math.min(Math.max(Number(cuantos) || HISTORIAL, 1), 100);

  const { rows } = await query(
    'SELECT id, user_id, username, texto, creado_en FROM chat_global ORDER BY id DESC LIMIT ?',
    [tope]
  );

  // Vienen del mas nuevo al mas viejo porque asi se piden los ultimos; se dan
  // vuelta para pintarlos en el orden en que se dijeron.
  return rows
    .map((r) => ({
      id: r.id,
      userId: Number(r.user_id),
      username: r.username,
      texto: r.texto,
      creadoEn: r.creado_en
    }))
    .reverse();
};

/**
 * Borra lo viejo para que la tabla no crezca para siempre.
 *
 * Nadie va a scrollear 500 mensajes hacia atras en el menu principal, y una
 * tabla de chat sin limite es la que termina llenando el disco del servidor.
 */
export const podar = async () => {
  await query(
    `DELETE FROM chat_global
     WHERE id <= (SELECT MAX(id) FROM chat_global) - ?`,
    [TOPE_GUARDADO]
  );
};
