import {
  explainPlacements,
  createGame,
  applyAction,
  playableMoves,
  viewFor,
  placementsFor,
  straightestPlacement,
  boardEnds,
  handPips,
  PHASE,
  ACTION
} from '@privoytruco/domino-engine';

export const GRID_SIZE = 20;

export const MODE_CONFIG = {
  // `turnMs` y `reconnectMs` solo estan en los modos entre personas. Contra la
  // maquina no hay reloj: el bot no se cuelga y apurar a quien juega solo no
  // tiene sentido. Decision de Jonathan.
  '1v1': { humans: 2, bots: 0, totalPlayers: 2, teams: false, hasPool: true, label: '1 vs 1', gameFormat: 'domino-1v1-v1', turnMs: 25000, reconnectMs: 60000 },
  '1v1bot': { humans: 1, bots: 1, totalPlayers: 2, teams: false, hasPool: true, label: '1 vs 1 (con bot)', gameFormat: 'domino-1v1-v1' },
  '2v2': { humans: 4, bots: 0, totalPlayers: 4, teams: true, hasPool: false, label: '2 vs 2', gameFormat: 'domino-2v2-v1', turnMs: 25000, reconnectMs: 60000 },
  // Banco de pruebas del 2v2: vos y tres bots. Usa el mismo gameFormat que el
  // 2v2 real, asi lo que se prueba aqui es exactamente lo que corre con humanos.
  '2v2bots': { humans: 1, bots: 3, totalPlayers: 4, teams: true, hasPool: false, label: '2 vs 2 (vos y 3 bots)', gameFormat: 'domino-2v2-v1' }
};

const PHASE_TO_STATUS = {
  [PHASE.PLAYING]: 'playing',
  [PHASE.ROUND_OVER]: 'round-end',
  [PHASE.GAME_OVER]: 'game-over'
};
const STATUS_TO_PHASE = {
  playing: PHASE.PLAYING,
  'round-end': PHASE.ROUND_OVER,
  'game-over': PHASE.GAME_OVER
};

export class DominoGame {
  constructor({ roomCode, mode, players, seed }) {
    const config = MODE_CONFIG[mode];
    if (!config) throw new Error('Modo inválido');

    this.roomCode = roomCode;
    this.mode = mode;
    this.config = config;
    this.players = players;

    this.state = createGame({
      gameFormat: config.gameFormat,
      seed,
      players: players.map((p) => ({ id: p.id, name: p.username, isBot: Boolean(p.isBot) })),
      // Si el modo lleva reloj, el motor tiene que saber que hacer cuando se
      // acaba: perder la ronda. El motor no cuenta el tiempo (no tiene relojes
      // por dentro), solo aplica la regla cuando el servidor le avisa.
      config: config.turnMs
        ? { turnMs: config.turnMs, timeoutRule: 'skip-turn' }
        : {}
    });

    this._syncPlayers();
    this._setupBots();
  }

  _syncPlayers() {
    this.players.forEach((p, i) => {
      p.team = this.state.teams[i];
      p.seat = i;
    });
  }

  _seatOf(playerId) {
    const i = this.players.findIndex((p) => p.id === playerId);
    return i === -1 ? null : i;
  }

  _setupBots() {
    this.bots = {};
    this.players.forEach((p) => {
      if (p.isBot) this.bots[p.id] = { memory: { playedTiles: [] } };
    });
  }

  get numPlayers() {
    return this.players.length;
  }

  get hasPool() {
    return this.state.config.hasPool;
  }

  get status() {
    return PHASE_TO_STATUS[this.state.phase];
  }
  set status(v) {
    this.state.phase = STATUS_TO_PHASE[v] || v;
  }

  get currentPlayerIndex() {
    return this.state.turn;
  }
  set currentPlayerIndex(v) {
    this.state.turn = v;
  }

  get board() {
    return this.state.board;
  }
  set board(v) {
    this.state.board = v;
  }

  get ends() {
    return this.state.ends;
  }
  set ends(v) {
    this.state.ends = v;
  }

  get pool() {
    return this.state.pool;
  }
  set pool(v) {
    this.state.pool = v;
  }

  get passes() {
    return this.state.passes;
  }
  set passes(v) {
    this.state.passes = v;
  }

  get round() {
    return this.state.round;
  }

  get teamScores() {
    return this.state.scores;
  }

  get _roundClosed() {
    return this.state.phase !== PHASE.PLAYING;
  }

  get winningTeam() {
    const deLaRonda = this._roundClosed ? this.state.lastRound?.winnerTeam ?? null : null;
    if (deLaRonda !== null) return deLaRonda;

    // Un abandono termina la partida sin cerrar ronda: el resultado queda en
    // state.result y no en lastRound. Sin esto, quien se queda ve la partida
    // terminada pero sin ganador.
    //
    // Se consulta DESPUES de la ronda y solo si esa no dijo nada: asi el final
    // normal sigue mostrando exactamente lo mismo que antes.
    if (this.state.phase === PHASE.GAME_OVER) return this.state.result?.winnerTeam ?? null;

    return null;
  }

  get winner() {
    if (!this._roundClosed) return null;
    const seat = this.state.lastRound?.winnerSeat;
    return seat == null ? null : this.players[seat]?.id ?? null;
  }

  get endReason() {
    const deLaRonda = this._roundClosed ? this.state.lastRound?.reason ?? null : null;
    if (deLaRonda !== null) return deLaRonda;

    if (this.state.phase === PHASE.GAME_OVER) return this.state.result?.reason ?? null;

    return null;
  }

  /** Asiento que abandono, si la partida termino asi. */
  get forfeitedSeat() {
    return this.state.result?.reason === 'forfeit' ? this.state.result.forfeitedSeat ?? null : null;
  }

  get roundPoints() {
    return this._roundClosed ? this.state.lastRound?.points ?? 0 : 0;
  }

  get lastAction() {
    const ev = [...this.state.events].reverse().find((e) =>
      ['PLAY_TILE', 'DRAW', 'PASS'].includes(e.kind)
    );
    if (!ev) return null;
    const type = ev.kind === 'PLAY_TILE' ? 'play' : ev.kind.toLowerCase();
    return { type, playerId: this.players[ev.seat]?.id, tile: ev.tile };
  }

  get hands() {
    const game = this;
    return new Proxy(
      {},
      {
        get(_t, key) {
          const seat = game._seatOf(key);
          return seat == null ? undefined : game.state.hands[seat];
        },
        set(_t, key, value) {
          const seat = game._seatOf(key);
          if (seat != null) game.state.hands[seat] = value;
          return true;
        },
        has(_t, key) {
          return game._seatOf(key) != null;
        },
        ownKeys() {
          return game.players.map((p) => String(p.id));
        },
        getOwnPropertyDescriptor(_t, key) {
          const seat = game._seatOf(key);
          if (seat == null) return undefined;
          return { enumerable: true, configurable: true, value: game.state.hands[seat] };
        }
      }
    );
  }

  getCurrentPlayer() {
    return this.players[this.state.turn];
  }

  getValidMoves(playerId) {
    const seat = this._seatOf(playerId);
    if (seat == null) return [];
    const hand = this.state.hands[seat] || [];
    const moves = playableMoves(this.state, seat);
    const seen = new Set();
    const out = [];
    for (const m of moves) {
      const key = `${m.tileIndex}-${m.side}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        tile: m.tile,
        index: m.tileIndex,
        side: m.side,
        handAfter: hand.filter((_, i) => i !== m.tileIndex)
      });
    }
    return out;
  }

  getValidPlacementsForTile(tile, side) {
    return placementsFor(this.state.board, tile, side, this.state.config.layout);
  }

  /**
   * Para cada ficha de la mano, por que NO se puede jugar.
   * Usa el diagnostico del motor en vez de adivinar.
   */
  explicarMano(playerId) {
    const seat = this._seatOf(playerId);
    if (seat == null) return [];
    const mano = this.state.hands[seat] || [];
    const ends = this.state.ends;

    return mano.map((tile, index) => {
      if (!ends) return { index, tile, jugable: true, motivo: null };

      const coincide = [ends.left, ends.right].some((e) => tile[0] === e || tile[1] === e);
      if (!coincide) {
        return {
          index,
          tile,
          jugable: false,
          motivo: `no tiene ${ends.left}${ends.left === ends.right ? '' : ' ni ' + ends.right}`
        };
      }

      const detalle = [];
      for (const side of ['left', 'right']) {
        const end = side === 'left' ? ends.left : ends.right;
        if (tile[0] !== end && tile[1] !== end) continue;
        const { validas, candidatas } = explainPlacements(
          this.state.board, tile, side, this.state.config.layout
        );
        if (validas.length > 0) return { index, tile, jugable: true, motivo: null };
        for (const c of candidatas) if (c.motivo) detalle.push(c.motivo);
      }

      const cuenta = {};
      for (const m of detalle) cuenta[m] = (cuenta[m] || 0) + 1;
      const principal = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0]?.[0];

      const texto = {
        'fuera-del-tablero': 'no queda espacio en la mesa por ese lado',
        'celda-ocupada': 'el lugar ya está ocupado',
        'roza-otra-ficha': 'quedaría pegada a otra ficha de la cadena',
        'solapa-visualmente': 'se montaría sobre otra ficha'
      };

      return {
        index,
        tile,
        jugable: false,
        motivo: texto[principal] || 'no hay lugar donde colocarla'
      };
    });
  }

  chooseBotPlacement(placements, side) {
    return straightestPlacement(this.state.board, placements, side);
  }

  _dispatch(playerId, action) {
    const seat = this._seatOf(playerId);
    if (seat == null) return { ok: false, error: 'Jugador no encontrado' };
    const r = applyAction(this.state, { ...action, seat });
    if (!r.ok) return { ok: false, error: r.error };
    this.state = r.state;
    return { ok: true, events: r.events };
  }

  playTile(playerId, tileIndex, side = null, x = null, y = null, x2 = null, y2 = null, orientation = null) {
    const action = { type: ACTION.PLAY_TILE, tileIndex, side: side || undefined };
    if (x != null && y != null) {
      action.placement = { x, y, x2, y2, orientation };
    }
    const r = this._dispatch(playerId, action);
    if (!r.ok) return r;
    return { ok: true };
  }

  drawFromPool(playerId, poolIndex = null) {
    const seat = this._seatOf(playerId);
    const accion = { type: ACTION.DRAW };
    if (Number.isInteger(poolIndex)) accion.poolIndex = poolIndex;
    const r = this._dispatch(playerId, accion);
    if (!r.ok) return r;
    const hand = this.state.hands[seat];
    return { ok: true, tile: hand[hand.length - 1] };
  }

  pass(playerId) {
    const r = this._dispatch(playerId, { type: ACTION.PASS });
    if (!r.ok) return r;
    return { ok: true, blocked: this.state.lastRound?.reason === 'blocked' };
  }

  startNextRound() {
    if (this.state.phase !== PHASE.ROUND_OVER) return false;
    const r = applyAction(this.state, { type: ACTION.START_NEXT_ROUND, seat: 0 });
    if (!r.ok) return false;
    this.state = r.state;
    this._setupBots();
    return true;
  }

  forfeit(playerId) {
    return this._dispatch(playerId, { type: ACTION.FORFEIT });
  }

  timeout(playerId) {
    return this._dispatch(playerId, { type: ACTION.TIMEOUT });
  }

  getStateForPlayer(playerId) {
    const seat = this._seatOf(playerId);
    const view = seat == null ? null : viewFor(this.state, seat);
    const validMoves = this.getValidMoves(playerId);
    const canPlay = validMoves.length > 0;

    return {
      roomCode: this.roomCode,
      mode: this.mode,
      hasPool: this.hasPool,
      targetPoints: this.state.config.targetPoints,
      // Cuanto dura un turno y cuanto le QUEDA al que esta en curso.
      //
      // Se manda lo que falta, no la hora en que vence. Si se mandara la hora
      // del servidor, cualquier telefono con el reloj corrido dibujaria una
      // cuenta atras equivocada; "faltan 8 segundos" se entiende igual en
      // cualquier reloj. Es null cuando el modo no lleva tiempo.
      turnMs: this.config.turnMs ?? null,
      turnRestanteMs: this.turnDeadline ? Math.max(0, this.turnDeadline - Date.now()) : null,
      // Cambia con cada turno. Es lo que le dice a la pantalla "esto es un
      // turno nuevo, vuelve a poner el reloj en hora".
      turnoId: this.turnDeadline ? this.turnoId ?? null : null,
      // Quien se cayo y cuanto le queda para volver. Viaja con el estado en vez
      // de por un evento aparte: asi el que se reconecta se entera igual, sin
      // depender de haber estado escuchando en el momento del corte.
      ausentes: this.players
        .filter((p) => !p.isBot && p.desconectadoHasta)
        .map((p) => ({
          seat: p.seat ?? this.players.indexOf(p),
          username: p.username,
          restanteMs: Math.max(0, p.desconectadoHasta - Date.now())
        })),
      poolCount: this.state.pool.length,
      status: this.status,
      round: this.state.round,
      teamScores: this.state.scores,
      winningTeam: this.winningTeam,
      roundPoints: this.roundPoints,
      endReason: this.endReason,
      forfeitedSeat: this.forfeitedSeat,
      // El ultimo a quien se le paso el turno por tiempo. Lleva un contador
      // para que la pantalla pueda avisar dos veces seguidas del mismo
      // jugador: sin el, React veria el mismo dato y no volveria a avisar.
      saltadoPorTiempo: this.saltadoPorTiempo ?? null,
      // Al cerrar la ronda se revelan las manos, para que se pueda verificar el puntaje
      revealedHands: this._roundClosed && this.state.lastRound
        ? this.players.map((p, i) => ({
            id: p.id,
            username: p.username,
            isBot: Boolean(p.isBot),
            team: this.state.teams[i],
            tiles: this.state.lastRound.hands[i] || [],
            pips: this.state.lastRound.pips[i] ?? 0
          }))
        : null,
      lastAction: this.lastAction,
      currentPlayerId: this.getCurrentPlayer()?.id,
      board: this.state.board,
      ends: this.state.ends,
      myHand: view ? view.hand : [],
      handCounts: this.players.reduce((acc, p, i) => {
        acc[p.id] = (this.state.hands[i] || []).length;
        return acc;
      }, {}),
      players: this.players.map((p, i) => ({
        id: p.id,
        username: p.username,
        isBot: Boolean(p.isBot),
        team: this.state.teams[i],
        seat: i,
        avatar: p.avatar || p.username,
        difficulty: p.difficulty || null,
        frase: p.frase || null,
        estrellas: p.estrellas || null
      })),
      validMoves: validMoves.map((m) => ({ index: m.index, tile: m.tile, side: m.side })),
      canPlay,
      canDraw: this.hasPool && !canPlay && this.state.pool.length > 0,
      canPass: !canPlay && (!this.hasPool || this.state.pool.length === 0)
    };
  }
}

export { handPips, boardEnds };
