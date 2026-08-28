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
