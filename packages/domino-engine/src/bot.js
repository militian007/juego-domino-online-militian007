import { createRng } from './rng.js';
import { generateSet, tileKey, pips, isDouble } from './tiles.js';

export const DIFFICULTY = {
  NOVATO: 'novato',
  FACIL: 'facil',
  NORMAL: 'normal',
  DIFICIL: 'dificil',
  MAESTRO: 'maestro',
  // alias en ingles, por compatibilidad con quien ya use estos nombres
  EASY: 'facil',
  HARD: 'maestro'
};

// NOISE  = cuanto ruido se le suma al puntaje de cada ficha (juega peor)
// RANDOM = con que probabilidad tira una ficha al azar, ignorando la estrategia
const NOISE = { novato: 22, facil: 14, normal: 6, dificil: 2, maestro: 0 };
const RANDOM_RATE = { novato: 0.45, facil: 0.28, normal: 0.10, dificil: 0.03, maestro: 0 };

// alias viejos
NOISE.easy = NOISE.facil;
NOISE.hard = NOISE.maestro;
RANDOM_RATE.easy = RANDOM_RATE.facil;
RANDOM_RATE.hard = RANDOM_RATE.maestro;

function unseenCounts(view) {
  const maxPip = view.maxPip ?? 6;
  const counts = {};
  for (let n = 0; n <= maxPip; n++) counts[n] = 0;

  const seen = new Set();
  for (const placed of view.board) seen.add(tileKey(placed.tile));
  for (const t of view.hand) seen.add(tileKey(t));

  for (const t of generateSet(maxPip)) {
    if (seen.has(tileKey(t))) continue;
    counts[t[0]] += 1;
    if (t[1] !== t[0]) counts[t[1]] += 1;
  }
  return counts;
}

function suitCount(hand, value) {
  let n = 0;
  for (const t of hand) if (t[0] === value || t[1] === value) n += 1;
  return n;
}

function nextActiveSeat(view) {
  const n = view.handCounts.length;
  for (let i = 1; i <= n; i++) {
    const cand = (view.turn + i) % n;
    if (!view.forfeited[cand]) return cand;
  }
  return view.turn;
}

function partnerSeat(view) {
  if (!view.teams) return null;
  for (let s = 0; s < view.teams.length; s++) {
    if (s !== view.seat && view.teams[s] === view.teams[view.seat]) return s;
  }
  return null;
}

function endsAfter(view, action) {
  const ends = view.ends;
  if (!ends) return { left: action.tile[0], right: action.tile[1] };
  if (action.side === 'left') {
    return {
      left: action.tile[0] === ends.left ? action.tile[1] : action.tile[0],
      right: ends.right
    };
  }
  return {
    left: ends.left,
    right: action.tile[1] === ends.right ? action.tile[0] : action.tile[1]
  };
}

function scorePlay(view, action, unseen) {
  const hand = view.hand;
  const remaining = hand.filter((_, i) => i !== action.tileIndex);
  let score = 0;

  if (remaining.length === 0) return 1000;

  score += pips(action.tile) * 1.5;

  const after = endsAfter(view, action);
  const mineLeft = suitCount(remaining, after.left);
  const mineRight = suitCount(remaining, after.right);
  score += (mineLeft + mineRight) * 2.5;
  if (mineLeft === 0 && mineRight === 0) score -= 14;

  if (after.left === after.right) {
    const n = after.left;
    const outstanding = Math.max(0, (unseen[n] || 0) - suitCount(remaining, n));
    if (outstanding <= 1) score += 12;
    else if (outstanding <= 2) score += 5;
  }

  const nextSeat = nextActiveSeat(view);
  const partner = partnerSeat(view);
  const nextIsRival = nextSeat !== partner;
  const nextHandSize = view.handCounts[nextSeat] ?? 7;

  if (nextIsRival && nextHandSize <= 2) score += pips(action.tile) * 0.8;
  if (!nextIsRival && partner != null && view.handCounts[partner] <= 2) score -= 4;

  if (isDouble(action.tile)) {
    const support = suitCount(remaining, action.tile[0]);
    score += support >= 1 ? 4 : 1.5;
  }

  return score;
}

export function chooseAction(view, opts = {}) {
  const actions = view.actions || [];
  if (actions.length === 0) return null;

  const difficulty = opts.difficulty || DIFFICULTY.NORMAL;
  const rng = createRng(opts.seed != null ? opts.seed : `${view.seat}:${view.seq}:${view.round}`);

  const plays = actions.filter((a) => a.type === 'PLAY_TILE');
  if (plays.length === 0) return actions[0];

  const randomRate = RANDOM_RATE[difficulty] ?? RANDOM_RATE.normal;
  if (randomRate > 0 && rng() < randomRate) {
    return plays[Math.floor(rng() * plays.length)];
  }

  const unseen = unseenCounts(view);
  const noise = NOISE[difficulty] ?? NOISE.normal;

  // 1. Que ficha jugar: estrategia de dominó, sin mirar geometría
  const porFicha = new Map();
  for (const a of plays) {
    const clave = a.tileIndex + '|' + a.side;
    if (!porFicha.has(clave)) {
      porFicha.set(clave, {
        score: scorePlay(view, a, unseen) + (noise > 0 ? (rng() - 0.5) * noise : 0),
        opciones: []
      });
    }
    porFicha.get(clave).opciones.push(a);
  }

  let mejor = null;
  let mejorScore = -Infinity;
  for (const grupo of porFicha.values()) {
    if (grupo.score > mejorScore) {
      mejorScore = grupo.score;
      mejor = grupo;
    }
  }

  // 2. Donde ponerla: seguir derecho si se puede. Una cadena recta se traba
  // mucho menos que una que serpentea (medido: 32% vs 44% de bloqueo geometrico).
  if (view.board.length === 0) return mejor.opciones[0];
  const extremo = mejor.opciones[0].side === 'left'
    ? view.board[0]
    : view.board[view.board.length - 1];
  const recta = mejor.opciones.find((a) => a.placement.orientation === extremo.orientation);
  return recta || mejor.opciones[0];
}

export function createBot(opts = {}) {
  return {
    difficulty: opts.difficulty || DIFFICULTY.NORMAL,
    act(view) {
      return chooseAction(view, { difficulty: this.difficulty, seed: opts.seed });
    }
  };
}
