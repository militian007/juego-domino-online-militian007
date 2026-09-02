import { createRng } from './rng.js';
import { generateSet, tileKey, pips, isDouble } from './tiles.js';

import { espacioEnLaPunta, aperturaFutura } from './layout.js';

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

// El `placement` de una accion viene sin la ficha. `aperturaFutura` necesita
// una ficha como las que guarda el tablero, con sus dos numeros en el orden
// correcto: el que engancha del lado de la cadena, el otro hacia afuera.
function fichaOrientada(view, accion) {
  const conn = accion.side === 'left' ? view.ends?.left : view.ends?.right;
  const outer = accion.tile[0] === conn ? accion.tile[1] : accion.tile[0];
  return accion.side === 'left' ? [outer, conn] : [conn, outer];
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

  // 2. Donde ponerla. Primero, no dejar la punta contra el borde de la mesa:
  // si la cadena avanza derecho hasta chocar, el siguiente doble ya no tiene
  // hacia donde cruzarse. Medido: el extremo quedaba pegado al borde el 19.2%
  // del tiempo y eso causaba el 66% de las fichas trancadas.
  //
  // Recien despues se prefiere seguir derecho: una cadena recta se traba menos
  // que una que serpentea (medido: 32% contra 44% de bloqueo geometrico).
  if (view.board.length === 0) return mejor.opciones[0];

  const grid = view.layout?.grid ?? 20;
  const aire = (a) => {
    const p = a.placement;
    const punta = a.side === 'left' ? { x: p.x, y: p.y } : { x: p.x2, y: p.y2 };
    return Math.min(2, punta.x, punta.y, grid - 1 - punta.x, grid - 1 - punta.y);
  };
  // Si el extremo es un doble, salir cruzado manda sobre no pegarse al borde.
  const extremoDe = (a) => (a.side === 'left' ? view.board[0] : view.board[view.board.length - 1]);
  let opciones = mejor.opciones;
  const ext0 = extremoDe(opciones[0]);
  if (ext0.tile[0] === ext0.tile[1]) {
    const cruzadas = opciones.filter((a) => a.placement.orientation !== extremoDe(a).orientation);
    if (cruzadas.length > 0) opciones = cruzadas;
  }

  // El mismo cerebro que usa el jugador (ver layout.js): entre las colocaciones
  // de esta ficha gana la que deja el tablero mas abierto para la siguiente.
  // Solo se compara dentro de la MISMA punta: cual punta conviene ya lo decidio
  // la estrategia de arriba y no se toca.
  const conPlacement = opciones.filter((a) => a.placement);
  if (conPlacement.length > 1) {
    const aperturas = conPlacement.map((a) =>
      aperturaFutura(view.board, { ...a.placement, tile: fichaOrientada(view, a) }, a.side, view.layout)
    );
    const mejor2 = Math.max(...aperturas);
    opciones = conPlacement.filter((a, i) => aperturas[i] === mejor2);
  }

  const mejorAire = Math.max(...opciones.map(aire));
  const holgadas = opciones.filter((a) => aire(a) === mejorAire);

  const extremo = extremoDe(holgadas[0]);
  // Si el extremo es un doble, la cadena sale CRUZADA respecto de el, no por su
  // mismo eje: un doble va acostado sobre la cadena, no de pie en la fila.
  const extremoEsDoble = extremo.tile[0] === extremo.tile[1];
  const rectas = holgadas.filter((a) =>
    extremoEsDoble
      ? a.placement.orientation !== extremo.orientation
      : a.placement.orientation === extremo.orientation
  );

  // Entre las que siguen derecho gana la que deja mas sitio libre alrededor.
  // El orden importa: mirar el sitio libre antes que la recta empeora las cosas.
  // Ver contexto/README.md seccion 73.
  const pool = rectas.length > 0 ? rectas : holgadas;
  if (pool.length === 1) return pool[0];
  const espacios = pool.map((a) => espacioEnLaPunta(view.board, a.placement, a.side, view.layout));
  return pool[espacios.indexOf(Math.max(...espacios))];
}

export function createBot(opts = {}) {
  return {
    difficulty: opts.difficulty || DIFFICULTY.NORMAL,
    act(view) {
      return chooseAction(view, { difficulty: this.difficulty, seed: opts.seed });
    }
  };
}
