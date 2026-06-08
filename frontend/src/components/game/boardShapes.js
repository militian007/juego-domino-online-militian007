export const TILE_W = 64;
export const TILE_H = 32;

const HORIZ = 0;
const VERT = 1;

function shapeL(i) {
  return i < 14 ? HORIZ : VERT;
}

function shapeEscalera(i) {
  return (i % 4) < 3 ? HORIZ : VERT;
}

function shapeCuesta(i) {
  const segs = [4, 1, 2, 1, 4, 1, 2, 1, 4, 1, 2, 1, 4, 1];
  let acc = 0;
  for (let s = 0; s < segs.length; s++) {
    acc += segs[s];
    if (i < acc) return s % 2 === 0 ? HORIZ : VERT;
  }
  return HORIZ;
}

function shapeGancho(i) {
  if (i < 8) return HORIZ;
  if (i < 14) return VERT;
  if (i < 22) return HORIZ;
  return VERT;
}

function shapeSerpiente(i) {
  const segs = [2, 1, 3, 1, 2, 1, 3, 1, 2, 1, 3, 1, 2, 1, 3, 1, 1];
  let acc = 0;
  for (let s = 0; s < segs.length; s++) {
    acc += segs[s];
    if (i < acc) return s % 2 === 0 ? HORIZ : VERT;
  }
  return HORIZ;
}

export const SHAPES = [
  { id: 'espiral', name: 'Espiral', icon: '🌀', fn: shapeL },
  { id: 'serpiente', name: 'Serpiente', icon: '∿', fn: shapeSerpiente },
  { id: 'bucle', name: 'Bucle Envolvente', icon: '⌒', fn: shapeGancho },
  { id: 'zigzag', name: 'Zig-Zag Filas', icon: '⎓', fn: shapeEscalera },
  { id: 'laberinto', name: 'Zig-Zag Columnas', icon: '⫴', fn: shapeCuesta }
];

export function getShapeById(id) {
  return SHAPES.find((s) => s.id === id) || SHAPES[0];
}

export function getRandomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}
