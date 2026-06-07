export const TILE_W = 64;
export const TILE_H = 32;

const HORIZ = 0;
const VERT = 1;

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function shapeL(i) {
  if (i < 8) return HORIZ;
  return VERT;
}

function shapeCruz(i) {
  const segment = Math.floor(i / 4);
  const inSeg = i % 4;
  if (segment % 4 === 0) return HORIZ;
  if (segment % 4 === 1) return VERT;
  if (segment % 4 === 2) return HORIZ;
  return VERT;
}

function shapeCuadrado(i) {
  const side = 7;
  if (i < side) return HORIZ;
  if (i < side * 2) return VERT;
  if (i < side * 3) return HORIZ;
  return VERT;
}

function shapeT(i) {
  if (i < 8) return HORIZ;
  return VERT;
}

function shapeS(i) {
  const segment = Math.floor(i / 5);
  if (segment % 2 === 0) return HORIZ;
  return VERT;
}

export const SHAPES = [
  { id: 'l', name: 'L', icon: 'L', fn: shapeL },
  { id: 'cruz', name: 'Cruz', icon: '+', fn: shapeCruz },
  { id: 'cuadrado', name: 'Cuadrado', icon: '□', fn: shapeCuadrado },
  { id: 't', name: 'T', icon: 'T', fn: shapeT },
  { id: 's', name: 'Serpiente', icon: 'S', fn: shapeS }
];

export function getShapeById(id) {
  return SHAPES.find((s) => s.id === id) || SHAPES[0];
}

export function getRandomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}
