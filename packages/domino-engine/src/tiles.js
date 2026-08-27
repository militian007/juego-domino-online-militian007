export function generateSet(maxPip) {
  const tiles = [];
  for (let a = 0; a <= maxPip; a++) {
    for (let b = a; b <= maxPip; b++) tiles.push([a, b]);
  }
  return tiles;
}

export function normalize(tile) {
  return tile[0] <= tile[1] ? [tile[0], tile[1]] : [tile[1], tile[0]];
}

export function tileKey(tile) {
  const t = normalize(tile);
  return `${t[0]}-${t[1]}`;
}

export function pips(tile) {
  return tile[0] + tile[1];
}

export function isDouble(tile) {
  return tile[0] === tile[1];
}

export function handPips(hand) {
  let total = 0;
  for (const t of hand) total += pips(t);
  return total;
}

export function matchesEnd(tile, end) {
  return tile[0] === end || tile[1] === end;
}

export function otherHalf(tile, end) {
  return tile[0] === end ? tile[1] : tile[0];
}
