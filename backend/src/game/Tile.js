import { generateSet, normalize, pips, isDouble as engineIsDouble, tileKey } from '@privoytruco/domino-engine';

export const MAX_PIP = 6;
export const TILES_PER_PLAYER = 7;
export const WINNING_SCORE = 100;

export const generateAllTiles = () => generateSet(MAX_PIP);
export const tilePips = pips;
export const isDouble = engineIsDouble;
export const sortTile = normalize;
export { tileKey };

export function tileEquals(a, b) {
  return tileKey(a) === tileKey(b);
}
