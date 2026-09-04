import { createRng, shuffleWithRng, roundSeed, randomSeed } from './rng.js';
import { generateSet, normalize, pips, isDouble, handPips } from './tiles.js';
import { placementsFor, placementKey, straightestPlacement, boardEnds } from './layout.js';
import { resolveConfig, teamsFor } from './rules.js';

export const STATE_VERSION = 1;

export const PHASE = {
  PLAYING: 'playing',
  ROUND_OVER: 'round_over',
  GAME_OVER: 'game_over'
};

export const ACTION = {
  PLAY_TILE: 'PLAY_TILE',
  DRAW: 'DRAW',
  PASS: 'PASS',
  START_NEXT_ROUND: 'START_NEXT_ROUND',
  TIMEOUT: 'TIMEOUT',
  FORFEIT: 'FORFEIT'
};

export const EVENT = {
  DEAL: 'DEAL',
  PLAY_TILE: 'PLAY_TILE',
  DRAW: 'DRAW',
  PASS: 'PASS',
  TIMEOUT: 'TIMEOUT',
  FORFEIT: 'FORFEIT',
  ROUND_END: 'ROUND_END',
  GAME_END: 'GAME_END'
};

const clone = (v) => JSON.parse(JSON.stringify(v));

function push(state, event) {
  state.seq += 1;
  state.events.push({ seq: state.seq, round: state.round, ...event });
}

function emptyScores() {
  return { 1: 0, 2: 0 };
}

export function createGame(opts = {}) {
  const gameFormat = opts.gameFormat || 'domino-2v2-v1';
  const config = resolveConfig(gameFormat, opts.config || {});
  const seed = opts.seed != null ? String(opts.seed) : randomSeed();

  const state = {
    version: STATE_VERSION,
    gameFormat,
    config,
    seed,
    round: 0,
    phase: PHASE.PLAYING,
    turn: 0,
    starter: 0,
    teams: teamsFor(config),
    players: (opts.players || []).map((p, i) => ({
      seat: i,
      id: p?.id ?? `seat-${i}`,
      name: p?.name ?? `Jugador ${i + 1}`,
      isBot: Boolean(p?.isBot ?? config.botSeats.includes(i))
    })),
    hands: [],
    pool: [],
    board: [],
    ends: null,
    passes: 0,
    drawsThisTurn: 0,
    scores: emptyScores(),
    present: new Array(config.seats).fill(true),
    forfeited: new Array(config.seats).fill(false),
    lastRound: null,
    result: null,
    events: [],
    seq: 0
  };

  while (state.players.length < config.seats) {
    const i = state.players.length;
    state.players.push({
      seat: i,
      id: `seat-${i}`,
      name: `Jugador ${i + 1}`,
      isBot: config.botSeats.includes(i)
    });
  }
  state.players.length = config.seats;

  dealRound(state);
  return state;
}

function dealRound(state) {
  const cfg = state.config;
  state.round += 1;
  const rng = createRng(roundSeed(state.seed, state.round));
  const tiles = shuffleWithRng(generateSet(cfg.maxPip), rng).map(normalize);

  state.hands = [];
  for (let s = 0; s < cfg.seats; s++) {
    state.hands.push(tiles.slice(s * cfg.tilesPerPlayer, (s + 1) * cfg.tilesPerPlayer));
  }
  state.pool = cfg.hasPool ? tiles.slice(cfg.seats * cfg.tilesPerPlayer) : [];
  state.board = [];
  state.ends = null;
  state.passes = 0;
  state.drawsThisTurn = 0;
  state.phase = PHASE.PLAYING;
  state.turn = pickStarter(state);
  state.starter = state.turn;

  push(state, {
    kind: EVENT.DEAL,
    starter: state.turn,
    poolCount: state.pool.length,
    handCounts: state.hands.map((h) => h.length)
  });
}

function pickStarter(state) {
  const cfg = state.config;
  if (state.round > 1 && cfg.nextRoundStarter === 'winner' && state.lastRound) {
    if (state.lastRound.winnerSeat != null) return state.lastRound.winnerSeat;
    if (state.lastRound.winnerTeam) {
      const best = lowestPipSeatOfTeam(state, state.lastRound.winnerTeam);
      if (best != null) return best;
    }
    return state.starter;
  }

  let bestSeat = 0;
  let bestDouble = -1;
  for (let s = 0; s < cfg.seats; s++) {
    for (const t of state.hands[s]) {
      if (isDouble(t) && t[0] > bestDouble) {
        bestDouble = t[0];
        bestSeat = s;
      }
    }
  }
  if (bestDouble !== -1) return bestSeat;

  let bestPips = -1;
  for (let s = 0; s < cfg.seats; s++) {
    for (const t of state.hands[s]) {
      if (pips(t) > bestPips) {
        bestPips = pips(t);
        bestSeat = s;
      }
    }
  }
  return bestSeat;
}

function lowestPipSeatOfTeam(state, team) {
  let seat = null;
  let best = Infinity;
  for (let s = 0; s < state.config.seats; s++) {
    if (state.teams[s] !== team) continue;
    const p = handPips(state.hands[s] || []);
    if (p < best) {
      best = p;
      seat = s;
    }
  }
  return seat;
}

export function playableMoves(state, seat) {
  const hand = state.hands[seat] || [];
  if (hand.length === 0) return [];
  const cfg = state.config;
  const moves = [];

  if (state.board.length === 0) {
    hand.forEach((tile, tileIndex) => {
      for (const placement of placementsFor([], tile, 'first', cfg.layout)) {
        moves.push({ tileIndex, tile, side: 'first', placement });
      }
    });
    return moves;
  }

  hand.forEach((tile, tileIndex) => {
    for (const side of ['left', 'right']) {
      const end = side === 'left' ? state.ends.left : state.ends.right;
      if (tile[0] !== end && tile[1] !== end) continue;
      for (const placement of placementsFor(state.board, tile, side, cfg.layout)) {
        moves.push({ tileIndex, tile, side, placement });
      }
    }
  });
  return moves;
}

export function legalActions(state, seat) {
  if (state.phase === PHASE.GAME_OVER) return [];
  if (state.phase === PHASE.ROUND_OVER) {
    return [{ type: ACTION.START_NEXT_ROUND, seat }];
  }
  if (state.turn !== seat) return [];
  if (state.forfeited[seat]) return [];

  const moves = playableMoves(state, seat);
  if (moves.length > 0) {
    return moves.map((m) => ({
      type: ACTION.PLAY_TILE,
      seat,
      tileIndex: m.tileIndex,
      tile: m.tile,
      side: m.side,
      placement: {
        x: m.placement.x,
        y: m.placement.y,
        x2: m.placement.x2,
        y2: m.placement.y2,
        orientation: m.placement.orientation
      }
    }));
  }

  if (state.config.hasPool && state.pool.length > 0) {
    return [{ type: ACTION.DRAW, seat, poolCount: state.pool.length }];
  }
  return [{ type: ACTION.PASS, seat }];
}

function fail(state, error) {
  return { ok: false, error, state, events: [] };
}

export function applyAction(state, action) {
  if (!action || typeof action.type !== 'string') return fail(state, 'Acción inválida');
  const seat = action.seat;
  if (!Number.isInteger(seat) || seat < 0 || seat >= state.config.seats) {
    return fail(state, 'Asiento inválido');
  }

  const before = state.seq;
  const next = clone(state);
  let result;

  switch (action.type) {
    case ACTION.PLAY_TILE:
      result = doPlay(next, action);
      break;
    case ACTION.DRAW:
      result = doDraw(next, action);
      break;
    case ACTION.PASS:
      result = doPass(next, action);
      break;
    case ACTION.START_NEXT_ROUND:
      result = doNextRound(next, action);
      break;
    case ACTION.TIMEOUT:
      result = doTimeout(next, action);
      break;
    case ACTION.FORFEIT:
      result = doForfeit(next, action);
      break;
    default:
      return fail(state, `Acción desconocida: ${action.type}`);
  }

  if (!result.ok) return fail(state, result.error);
  return { ok: true, state: next, events: next.events.slice(before), error: null };
}

function requireTurn(state, seat) {
  if (state.phase !== PHASE.PLAYING) return 'La partida no está en juego';
  if (state.turn !== seat) return 'No es tu turno';
  return null;
}

function doPlay(state, action) {
  const err = requireTurn(state, action.seat);
  if (err) return { ok: false, error: err };

  const moves = playableMoves(state, action.seat);
  if (moves.length === 0) {
    return {
      ok: false,
      error: state.config.hasPool && state.pool.length > 0 ? 'Debes robar del pozo' : 'No tienes jugadas, debes pasar'
    };
  }

  let move;
  if (action.placement) {
    const wanted = placementKey(action.placement);
    move = moves.find(
      (m) => m.tileIndex === action.tileIndex && placementKey(m.placement) === wanted
    );
    if (!move) return { ok: false, error: 'Colocación inválida' };
  } else {
    const candidates = moves.filter(
      (m) => m.tileIndex === action.tileIndex && (!action.side || m.side === action.side)
    );
    if (candidates.length === 0) return { ok: false, error: 'Jugada inválida' };
    const side = candidates[0].side;
    const chosen = straightestPlacement(state.board, candidates.map((c) => c.placement), side);
    move = candidates.find((c) => placementKey(c.placement) === placementKey(chosen)) || candidates[0];
  }

  commitPlacement(state, action.seat, move);

  if (state.hands[action.seat].length === 0) {
    endRound(state, 'domino', action.seat);
    return { ok: true };
  }
  advanceTurn(state);
  return { ok: true };
}

function commitPlacement(state, seat, move) {
  const p = move.placement;
  const placed = {
    tile: [p.tile[0], p.tile[1]],
    side: move.side,
    x: p.x,
    y: p.y,
    x2: p.x2,
    y2: p.y2,
    orientation: p.orientation,
    bySeat: seat,
    seq: state.seq + 1
  };

  state.hands[seat] = state.hands[seat].filter((_, i) => i !== move.tileIndex);

  if (move.side === 'left') {
    state.board.unshift(placed);
  } else {
    state.board.push(placed);
  }
  state.ends = boardEnds(state.board);
  state.passes = 0;
  state.drawsThisTurn = 0;

  push(state, {
    kind: EVENT.PLAY_TILE,
    seat,
    tile: placed.tile,
    side: move.side,
    placement: { x: p.x, y: p.y, x2: p.x2, y2: p.y2, orientation: p.orientation },
    handCount: state.hands[seat].length
  });
}

function doDraw(state, action) {
  const err = requireTurn(state, action.seat);
  if (err) return { ok: false, error: err };
  if (!state.config.hasPool) return { ok: false, error: 'Esta modalidad no tiene pozo' };
  if (state.pool.length === 0) return { ok: false, error: 'El pozo está vacío' };
  if (playableMoves(state, action.seat).length > 0) {
    return { ok: false, error: 'Tienes jugadas disponibles, no puedes robar' };
  }

  // El jugador elige QUE ficha del pozo levanta. El azar ya ocurrio al repartir:
  // el orden del pozo quedo fijado por la seed al inicio de la mano y no cambia.
  // Elegir una posicion no cambia las probabilidades, solo le da la decision al
  // jugador en vez de servirle siempre la de arriba.
  const pedido = action.poolIndex;
  const indice = Number.isInteger(pedido) ? pedido : state.pool.length - 1;
  if (indice < 0 || indice >= state.pool.length) {
    return { ok: false, error: 'Esa ficha del pozo no existe' };
  }

  const tile = state.pool[indice];
  state.pool = state.pool.filter((_, i) => i !== indice);
  state.hands[action.seat].push(tile);
  state.drawsThisTurn += 1;

  push(state, {
    kind: EVENT.DRAW,
    seat: action.seat,
    tile,
    poolIndex: indice,
    poolCount: state.pool.length,
    handCount: state.hands[action.seat].length
  });
  return { ok: true };
}

function doPass(state, action) {
  const err = requireTurn(state, action.seat);
  if (err) return { ok: false, error: err };
  if (playableMoves(state, action.seat).length > 0) {
    return { ok: false, error: 'Tienes jugadas disponibles, no puedes pasar' };
  }
  if (state.config.hasPool && state.pool.length > 0) {
    return { ok: false, error: 'Aún hay fichas en el pozo, debes robar' };
  }

  state.passes += 1;
  state.drawsThisTurn = 0;
  push(state, { kind: EVENT.PASS, seat: action.seat, passes: state.passes });

  const active = state.forfeited.filter((f) => !f).length;
  if (state.passes >= active) {
    endRound(state, 'blocked', null);
    return { ok: true };
  }
  advanceTurn(state);
  return { ok: true };
}

function doTimeout(state, action) {
  const err = requireTurn(state, action.seat);
  if (err) return { ok: false, error: err };

  push(state, { kind: EVENT.TIMEOUT, seat: action.seat });

  // Se le acabo el tiempo: pierde el turno y juega el siguiente. Nada mas.
  //
  // NO se cuenta como "paso". Pasar es declarar que no tenes jugada, y este
  // quizas la tenia y no la hizo. Si contara, dos descuidos seguidos cerrarian
  // la ronda como trancada y se puntuaria por fichas, que es justo el castigo
  // que se quiso sacar.
  if (state.config.timeoutRule === 'skip-turn') {
    state.drawsThisTurn = 0;
    advanceTurn(state);
    return { ok: true };
  }

  const actions = legalActions(state, action.seat);
  if (actions.length === 0) return { ok: true };
  const auto = actions[0];
  if (auto.type === ACTION.PLAY_TILE) return doPlay(state, auto);
  if (auto.type === ACTION.DRAW) return doDraw(state, auto);
  return doPass(state, auto);
}

function doForfeit(state, action) {
  if (state.phase === PHASE.GAME_OVER) return { ok: false, error: 'La partida ya terminó' };
  if (state.forfeited[action.seat]) return { ok: false, error: 'Ese asiento ya abandonó' };

  state.forfeited[action.seat] = true;
  state.present[action.seat] = false;
  const quitTeam = state.teams[action.seat];
  push(state, { kind: EVENT.FORFEIT, seat: action.seat, team: quitTeam });

  const winnerTeam = quitTeam === 1 ? 2 : 1;
  state.scores[winnerTeam] = state.config.targetPoints;
  state.phase = PHASE.GAME_OVER;
  state.result = {
    winnerTeam,
    scores: { ...state.scores },
    reason: 'forfeit',
    forfeitedSeat: action.seat
  };
  push(state, { kind: EVENT.GAME_END, ...state.result });
  return { ok: true };
}

function doNextRound(state) {
  if (state.phase !== PHASE.ROUND_OVER) return { ok: false, error: 'La ronda no ha terminado' };
  dealRound(state);
  return { ok: true };
}

function advanceTurn(state) {
  const n = state.config.seats;
  for (let i = 1; i <= n; i++) {
    const cand = (state.turn + i) % n;
    if (!state.forfeited[cand]) {
      state.turn = cand;
      return;
    }
  }
}

function endRound(state, reason, winnerSeat) {
  const cfg = state.config;
  const revealed = state.hands.map((h) => h.slice());
  let winnerTeam = null;
  let points = 0;

  if (reason === 'domino') {
    winnerTeam = state.teams[winnerSeat];
    for (let s = 0; s < cfg.seats; s++) {
      if (state.teams[s] !== winnerTeam) points += handPips(state.hands[s]);
    }
  } else {
    const teamPips = { 1: 0, 2: 0 };
    for (let s = 0; s < cfg.seats; s++) teamPips[state.teams[s]] += handPips(state.hands[s]);
    if (teamPips[1] < teamPips[2]) {
      winnerTeam = 1;
      points = cfg.blockedScoring === 'difference' ? teamPips[2] - teamPips[1] : teamPips[2];
    } else if (teamPips[2] < teamPips[1]) {
      winnerTeam = 2;
      points = cfg.blockedScoring === 'difference' ? teamPips[1] - teamPips[2] : teamPips[1];
    } else {
      winnerTeam = null;
      points = 0;
    }
    if (winnerTeam != null) {
      winnerSeat = lowestPipSeatOfTeam(state, winnerTeam);
    }
  }

  if (winnerTeam != null) state.scores[winnerTeam] += points;

  state.lastRound = {
    round: state.round,
    reason,
    winnerSeat: winnerTeam == null ? null : winnerSeat,
    winnerTeam,
    points,
    hands: revealed,
    pips: revealed.map(handPips)
  };
  state.phase = PHASE.ROUND_OVER;

  push(state, { kind: EVENT.ROUND_END, ...state.lastRound });

  if (state.scores[1] >= cfg.targetPoints || state.scores[2] >= cfg.targetPoints) {
    state.phase = PHASE.GAME_OVER;
    state.result = {
      winnerTeam: state.scores[1] >= state.scores[2] ? 1 : 2,
      scores: { ...state.scores },
      reason: 'points'
    };
    push(state, { kind: EVENT.GAME_END, ...state.result });
  }
}

export function isTerminal(state) {
  return state.phase === PHASE.GAME_OVER;
}

export function currentSeat(state) {
  return state.phase === PHASE.PLAYING ? state.turn : null;
}

export function viewFor(state, seat, opts = {}) {
  const sinceSeq = opts.sinceSeq ?? 0;
  const reveal = state.phase !== PHASE.PLAYING;
  return {
    version: state.version,
    gameFormat: state.gameFormat,
    seat,
    phase: state.phase,
    round: state.round,
    turn: state.turn,
    starter: state.starter,
    yourTurn: state.phase === PHASE.PLAYING && state.turn === seat,
    board: state.board,
    ends: state.ends,
    layout: state.config.layout,
    maxPip: state.config.maxPip,
    tilesPerPlayer: state.config.tilesPerPlayer,
    targetPoints: state.config.targetPoints,
    hasPool: state.config.hasPool,
    poolCount: state.pool.length,
    hand: (state.hands[seat] || []).slice(),
    handCounts: state.hands.map((h) => h.length),
    revealedHands: reveal && state.lastRound ? state.lastRound.hands : null,
    scores: { ...state.scores },
    teams: state.teams.slice(),
    players: state.players.map((p) => ({ seat: p.seat, id: p.id, name: p.name, isBot: p.isBot })),
    present: state.present.slice(),
    forfeited: state.forfeited.slice(),
    passes: state.passes,
    lastRound: state.lastRound,
    result: state.result,
    actions: legalActions(state, seat),
    events: state.events.filter((e) => e.seq > sinceSeq),
    seq: state.seq
  };
}

export function spectatorView(state, opts = {}) {
  const v = viewFor(state, -1, opts);
  v.hand = [];
  v.actions = [];
  v.spectator = true;
  return v;
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : clone(json);
  if (s.version !== STATE_VERSION) {
    throw new Error(`Versión de estado incompatible: ${s.version} (esperada ${STATE_VERSION})`);
  }
  return s;
}
