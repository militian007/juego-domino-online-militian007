export const TILE_W = 64;
export const TILE_H = 32;

const HORIZ = 0;
const VERT = 1;

function shapeL(i) {
  return i < 8 ? HORIZ : VERT;
}

function shapeCruz(i) {
  const seg = Math.floor(i / 9);
  const inSeg = i % 9;
  if (inSeg < 8) return HORIZ;
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
  const seg = Math.floor(i / 9);
  const inSeg = i % 9;
  if (inSeg < 5) return HORIZ;
  return VERT;
}

function shapeS(i) {
  const seg = Math.floor(i / 5);
  const inSeg = i % 5;
  if (inSeg < 3) return HORIZ;
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
