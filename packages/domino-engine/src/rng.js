const MASK = 0xffffffff;

export function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) & MASK;
  }
  return h >>> 0;
}

export function createRng(seed) {
  let a = (typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)) || 0x9e3779b9;
  return function next() {
    a = (a + 0x6d2b79f5) & MASK;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithRng(array, rng) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function roundSeed(matchSeed, round) {
  return hashSeed(`${matchSeed}:${round}`);
}

export function randomSeed() {
  const g = globalThis.crypto;
  if (g && typeof g.getRandomValues === 'function') {
    const buf = new Uint32Array(4);
    g.getRandomValues(buf);
    return Array.from(buf, (n) => n.toString(16).padStart(8, '0')).join('');
  }
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  }
  return out;
}

export async function commitSeed(seed, salt) {
  const g = globalThis.crypto;
  const payload = `${salt || ''}:${seed}`;
  if (g && g.subtle && typeof g.subtle.digest === 'function') {
    const bytes = new TextEncoder().encode(payload);
    const digest = await g.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return hashSeed(payload).toString(16).padStart(8, '0');
}
