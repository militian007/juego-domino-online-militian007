/**
 * Los rivales de la casa.
 *
 * Cada uno es una dificultad del motor con nombre y cara propia. El `avatar`
 * es la semilla con la que el frontend dibuja el retrato: no hay imagenes,
 * se generan por codigo.
 */

export const BOTS = [
  {
    id: 'nano',
    nombre: 'Nano',
    difficulty: 'novato',
    avatar: 'nano',
    frase: 'Apenas estoy agarrando el hilo',
    estrellas: 1
  },
  {
    id: 'chela',
    nombre: 'Doña Chela',
    difficulty: 'facil',
    avatar: 'chela',
    frase: 'Yo juego es por la conversa',
    estrellas: 2
  },
  {
    id: 'catire',
    nombre: 'El Catire',
    difficulty: 'normal',
    avatar: 'catire',
    frase: 'Tranquilo que aqui hay mesa pa rato',
    estrellas: 3
  },
  {
    id: 'comadre',
    nombre: 'La Comadre',
    difficulty: 'dificil',
    avatar: 'comadre',
    frase: 'Te veo las fichas desde aqui',
    estrellas: 4
  },
  {
    id: 'tigre',
    nombre: 'El Tigre',
    difficulty: 'maestro',
    avatar: 'tigre',
    frase: 'Sientate, que esto no va a durar',
    estrellas: 5
  }
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
