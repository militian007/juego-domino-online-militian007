export const MAX_PIP = 6;
export const TILES_PER_PLAYER = 7;
export const WINNING_SCORE = 100;

export function generateAllTiles() {
  const tiles = [];
  for (let a = 0; a <= MAX_PIP; a++) {
    for (let b = a; b <= MAX_PIP; b++) {
      tiles.push([a, b]);
    }
  }
  return tiles;
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function tileKey([a, b]) {
  return a <= b ? `${a}-${b}` : `${b}-${a}`;
}

export function tilePips([a, b]) {
  return a + b;
}

export function isDouble([a, b]) {
  return a === b;
}

export function tileEquals(a, b) {
  return tileKey(a) === tileKey(b);
}

export function sortTile([a, b]) {
  return a <= b ? [a, b] : [b, a];
}
