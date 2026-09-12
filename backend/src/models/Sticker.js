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

/** Los de siempre, gratis. Emoji pelado, sin dibujo. */
export const BASE = ['😎', '😂', '🤣', '😆', '😡', '🤬', '😒', '😮'];

/**
 * Los que se ganan en el pase.
 *
 * `clave` es la misma que se guarda en `desbloqueos`. El nivel en el que cae
 * cada uno esta en la escalera de `Pase.js`, no aqui: la escalera es la que
 * manda, esto es solo el catalogo.
 */
/**
 * `imagen` es el dibujo del Panita, que es lo que se ve de verdad. El `emoji`
 * se queda de respaldo: viaja igual en el mensaje del socket, y si un dibujo
 * todavia no existe la pantalla cae en el emoji sin romperse.
 */
const premiado = (id, emoji, nombre) => ({
  clave: `sticker:${id}`,
  emoji,
  nombre,
  imagen: `/stickers/${id}.png`
});

/**
 * Los cuatro con dibujo que NO cuestan nada.
 *
 * Van gratis a proposito. Son las cuatro reacciones de todos los dias —pensar,
 * llorar, aplaudir, dormirse—, y ya estaban abiertas como emoji: 🤔, 😭 y 🥱
 * salieron de `BASE` y entraron aqui con el dibujo del Panita. Cobrar por algo
 * que la gente ya tenia seria quitarselo, que es justo lo que el pase no hace.
 *
 * El aplauso es el unico nuevo de verdad: no habia 👏 en la lista.
 */
export const LIBRES = [
  premiado('pensando', '🤔', 'Pensando'),
  premiado('llorando', '😭', 'Llorando'),
  premiado('aplauso', '👏', 'Aplausos'),
  premiado('dormido', '🥱', 'Dormido')
];

export const PREMIADOS = [
  premiado('candela', '🔥', 'Candela'),
  premiado('corona', '👑', 'Corona'),
  premiado('suerte', '🍀', 'Suerte'),
  premiado('chivo', '🐐', 'El Chivo'),
  premiado('cerebro', '🧠', 'Cerebro'),
  premiado('respeto', '🫡', 'Respeto'),
  premiado('diamante', '💎', 'Diamante')
];

const POR_EMOJI = new Map(PREMIADOS.map((s) => [s.emoji, s]));
const LIBRE_POR_EMOJI = new Map(LIBRES.map((s) => [s.emoji, s]));

// Solo los del pase: esta tabla es la que dice que claves se pueden entregar
// como premio, y las de los libres no se entregan porque ya las tiene todo el
// mundo.
const POR_CLAVE = new Map(PREMIADOS.map((s) => [s.clave, s]));

export const esSticker = (clave) => POR_CLAVE.has(clave);

export const porClave = (clave) => POR_CLAVE.get(clave) ?? null;

/**
 * Dice si esa persona puede tirar ese sticker.
 *
 * Los de siempre y los cuatro libres, cualquiera. Los del pase, solo quien los
 * gano. Lo que no este en ninguna de las tres listas no se manda: no es un
 * sticker.
 */
export const puedeTirar = async (userId, emoji) => {
  if (BASE.includes(emoji)) return true;
  if (LIBRE_POR_EMOJI.has(emoji)) return true;

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
    libres: LIBRES,
    premiados: PREMIADOS.map((s) => ({ ...s, mio: mios.includes(s.clave) }))
  };
};
