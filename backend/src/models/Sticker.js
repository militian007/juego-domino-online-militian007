import * as Desbloqueo from './Desbloqueo.js';

/**
 * Los stickers que se tiran en la mesa.
 *
 * Hay dos grupos:
 *
 * - **Los de siempre**: los once que ya estaban. Siguen abiertos para todo el
 *   mundo. Un premio no puede ser quitarle algo a quien ya lo tenia.
 * - **Los del pase**: se ganan subiendo de nivel. Se ven igual en el menu, con
 *   candado, para que se sepa lo que uno se esta perdiendo.
 *
 * ## Por que el servidor tiene que conocerlos
 *
 * Antes el servidor reenviaba **cualquier cosa** que le mandaran en el campo
 * `emoji`: no lo miraba. Con las herramientas del navegador, cualquiera podia
 * mandar el texto que se le antojara y aparecia flotando en la mesa de todos.
 * Ahora se comprueba contra esta lista, y ademas que quien lo manda lo tenga
 * ganado (regla 8: el servidor manda).
 */

/** Los de siempre, gratis. */
export const BASE = ['😎', '😂', '🤣', '😆', '😭', '😡', '🤬', '🥱', '🤔', '😒', '😮'];

/**
 * Los que se ganan en el pase.
 *
 * `clave` es la misma que se guarda en `desbloqueos`. El nivel en el que cae
 * cada uno esta en la escalera de `Pase.js`, no aqui: la escalera es la que
 * manda, esto es solo el catalogo.
 */
export const PREMIADOS = [
  { clave: 'sticker:candela', emoji: '🔥', nombre: 'Candela' },
  { clave: 'sticker:corona', emoji: '👑', nombre: 'Corona' },
  { clave: 'sticker:suerte', emoji: '🍀', nombre: 'Suerte' },
  { clave: 'sticker:chivo', emoji: '🐐', nombre: 'El Chivo' },
  { clave: 'sticker:cerebro', emoji: '🧠', nombre: 'Cerebro' },
  { clave: 'sticker:respeto', emoji: '🫡', nombre: 'Respeto' },
  { clave: 'sticker:diamante', emoji: '💎', nombre: 'Diamante' }
];

const POR_EMOJI = new Map(PREMIADOS.map((s) => [s.emoji, s]));
const POR_CLAVE = new Map(PREMIADOS.map((s) => [s.clave, s]));

export const esSticker = (clave) => POR_CLAVE.has(clave);

export const porClave = (clave) => POR_CLAVE.get(clave) ?? null;

/**
 * Dice si esa persona puede tirar ese sticker.
 *
 * Los de siempre, cualquiera. Los del pase, solo quien los gano. Lo que no
 * este en ninguna de las dos listas no se manda: no es un sticker.
 */
export const puedeTirar = async (userId, emoji) => {
  if (BASE.includes(emoji)) return true;

  const premiado = POR_EMOJI.get(emoji);
  if (!premiado) return false;
  if (!userId) return false;

  return Desbloqueo.tiene(userId, premiado.clave);
};

/** El catalogo entero con lo que tiene ganado esa persona, para pintar el menu. */
export const catalogoPara = async (userId) => {
  const mios = userId ? await Desbloqueo.de(userId) : [];
  return {
    base: BASE,
    premiados: PREMIADOS.map((s) => ({ ...s, mio: mios.includes(s.clave) }))
  };
};
