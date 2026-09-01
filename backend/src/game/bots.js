/**
 * Los rivales de la casa: 12 caras, 6 mujeres y 6 hombres.
 *
 * Cada uno es una dificultad del motor con nombre, frase y cara propia. El
 * `avatar` es el nombre del archivo del retrato en `frontend/public/avatares/`.
 * Si el archivo no está, el frontend dibuja el retrato viejo de SVG, asi que
 * agregar un bot nunca deja un hueco.
 *
 * `sexo` no lo usa el juego: esta para que se pueda regenerar el retrato de
 * cualquiera sin tener que adivinar cuál era.
 */

const bot = (id, nombre, sexo, difficulty, estrellas, frase) => ({
  id, nombre, sexo, difficulty, estrellas, frase, avatar: id
});

export const BOTS = [
  bot('nano', 'Nano', 'h', 'novato', 1, 'Apenas estoy agarrando el hilo'),
  bot('yubi', 'Yubi', 'm', 'novato', 1, 'Enséñame bien que yo aprendo rápido'),
  bot('chela', 'Doña Chela', 'm', 'facil', 2, 'Yo juego es por la conversa'),
  bot('chuo', 'Chuo', 'h', 'facil', 2, 'Dale pues, que la tarde esta larga'),
  bot('paula', 'La Negra Paula', 'm', 'facil', 2, 'Siéntate que aquí se juega sabroso'),
  bot('catire', 'El Catire', 'h', 'normal', 3, 'Tranquilo que aquí hay mesa pa rato'),
  bot('juana', 'Mama Juana', 'm', 'normal', 3, 'Con calma se gana, mijo'),
  bot('musiu', 'El Musiú', 'h', 'normal', 3, 'Aprendí aquí, no se crea'),
  bot('comadre', 'La Comadre', 'm', 'dificil', 4, 'Te veo las fichas desde aquí'),
  bot('pancho', 'Don Pancho', 'h', 'dificil', 4, 'Cuarenta años en esta mesa'),
  bot('zurda', 'La Zurda', 'm', 'maestro', 5, 'No te confíes de la mano izquierda'),
  bot('tigre', 'El Tigre', 'h', 'maestro', 5, 'Siéntate, que esto no va a durar')
];

export const porId = (id) => BOTS.find((b) => b.id === id) || null;

export const porDificultad = (difficulty) =>
  BOTS.find((b) => b.difficulty === difficulty) || null;

export function elegirBot(preferido) {
  if (preferido) {
    const buscado = porId(preferido) || porDificultad(preferido);
    if (buscado) return buscado;
  }
  return BOTS[Math.floor(Math.random() * BOTS.length)];
}

/**
 * Varios rivales distintos para una misma mesa. Se evita repetir cara y nombre,
 * porque en 2v2 hay tres bots sentados a la vez y dos "Doña Chela" confunden.
 */
export function elegirBots(cantidad, preferido) {
  const elegidos = [];
  const primero = elegirBot(preferido);
  if (primero) elegidos.push(primero);
  const resto = BOTS.filter((b) => b.id !== primero?.id);
  for (let i = resto.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resto[i], resto[j]] = [resto[j], resto[i]];
  }
  while (elegidos.length < cantidad && resto.length) elegidos.push(resto.pop());
  return elegidos.slice(0, cantidad);
}
