import {
  generateAllTiles,
  shuffle,
  tilePips,
  isDouble,
  TILES_PER_PLAYER,
  WINNING_SCORE
} from './Tile.js';

export const MODE_CONFIG = {
  '1v1': { humans: 2, bots: 0, totalPlayers: 2, teams: false, hasPool: true, label: '1 vs 1' },
  '1v1bot': { humans: 1, bots: 1, totalPlayers: 2, teams: false, hasPool: true, label: '1 vs 1 (con bot)' },
  '2v2': { humans: 4, bots: 0, totalPlayers: 4, teams: true, hasPool: false, label: '2 vs 2' }
};

export class DominoGame {
  constructor({ roomCode, mode, players }) {
    this.roomCode = roomCode;
    this.mode = mode;
    this.config = MODE_CONFIG[mode];
    if (!this.config) throw new Error('Modo inválido');
    this.players = players;
    this.hands = {};
    this.board = [];
    this.ends = null;
    this.currentPlayerIndex = 0;
    this.passes = 0;
    this.round = 1;
    this.teamScores = { 1: 0, 2: 0 };
    this.roundStarterIndex = 0;
    this.winner = null;
    this.winningTeam = null;
    this.endReason = null;
    this.lastAction = null;
    this.status = 'playing';
    this.pool = [];
    this.drawsThisTurn = 0;

    this._buildTeams();
    this._deal();
    this._determineStarter();
    this._setupBots();
  }

  get numPlayers() {
    return this.players.length;
  }

  get hasPool() {
    return this.config.hasPool;
  }

  _buildTeams() {
    if (this.config.teams) {
      this.players.forEach((p, i) => {
        p.team = i % 2 === 0 ? 1 : 2;
        p.seat = i;
      });
    } else {
      this.players[0].team = 1;
      this.players[0].seat = 0;
      for (let i = 1; i < this.players.length; i++) {
        this.players[i].team = 2;
        this.players[i].seat = i;
      }
    }
  }

  _deal() {
    const tiles = shuffle(generateAllTiles());
    const numPlayers = this.players.length;
    const perPlayer = TILES_PER_PLAYER;
    this.players.forEach((p, i) => {
      this.hands[p.id] = tiles
        .slice(i * perPlayer, (i + 1) * perPlayer)
        .map((t) => (t[0] <= t[1] ? t : [t[1], t[0]]));
    });
    if (this.config.hasPool) {
      this.pool = tiles
        .slice(numPlayers * perPlayer)
        .map((t) => (t[0] <= t[1] ? t : [t[1], t[0]]));
    } else {
      this.pool = [];
    }
  }

  _determineStarter() {
    let highestDouble = -1;
    let highestPip = -1;
    let starterIndex = 0;

    this.players.forEach((p, idx) => {
      for (const tile of this.hands[p.id]) {
        if (isDouble(tile) && tile[0] > highestDouble) {
          highestDouble = tile[0];
          starterIndex = idx;
        }
      }
    });

    if (highestDouble === -1) {
      this.players.forEach((p, idx) => {
        for (const tile of this.hands[p.id]) {
          if (tilePips(tile) > highestPip) {
            highestPip = tilePips(tile);
            starterIndex = idx;
          }
        }
      });
    }

    this.currentPlayerIndex = starterIndex;
    this.roundStarterIndex = starterIndex;
  }

  _setupBots() {
    this.bots = {};
    this.players.forEach((p) => {
      if (p.isBot) {
        this.bots[p.id] = {
          memory: { playedTiles: [], remainingByNumber: this._initialCount() }
        };
      }
    });
  }

  _initialCount() {
    const counts = {};
    for (let i = 0; i <= 6; i++) counts[i] = 7;
    return counts;
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getValidMoves(playerId) {
    const hand = this.hands[playerId];
    if (!hand || hand.length === 0) return [];

    if (!this.ends) {
      return hand.map((tile, index) => ({
        tile,
        index,
        side: 'first',
        handAfter: hand.filter((_, i) => i !== index)
      }));
    }

    const moves = [];
    hand.forEach((tile, index) => {
      if (tile[0] === this.ends.left || tile[1] === this.ends.left) {
        moves.push({
          tile,
          index,
          side: 'left',
          handAfter: hand.filter((_, i) => i !== index)
        });
      }
      if (this.ends.right !== this.ends.left) {
        if (tile[0] === this.ends.right || tile[1] === this.ends.right) {
          moves.push({
            tile,
            index,
            side: 'right',
            handAfter: hand.filter((_, i) => i !== index)
          });
        }
      }
    });

    const seen = new Set();
    return moves.filter((m) => {
      const k = `${m.tile[0]}-${m.tile[1]}-${m.side}-${m.index}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  canPlay(playerId, tileIndex, side) {
    const moves = this.getValidMoves(playerId);
    return moves.some(
      (m) => m.index === tileIndex && (m.side === side || m.side === 'first')
    );
  }

  playTile(playerId, tileIndex, side = null) {
    if (this.status !== 'playing') {
      return { ok: false, error: 'La partida no está activa' };
    }
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) {
      return { ok: false, error: 'No es tu turno' };
    }
    const moves = this.getValidMoves(playerId);
    if (moves.length === 0) {
      return { ok: false, error: this.hasPool && this.pool.length > 0
        ? 'Debes robar del pozo'
        : 'No tienes jugadas válidas, debes pasar' };
    }
    let move;
    if (side) {
      move = moves.find((m) => m.index === tileIndex && m.side === side);
    } else {
      move = moves.find((m) => m.index === tileIndex);
    }
    if (!move) {
      return { ok: false, error: 'Jugada inválida' };
    }

    const tile = move.tile;
    const hand = this.hands[playerId];
    this.hands[playerId] = hand.filter((_, i) => i !== tileIndex);

    this._placeTile(tile, move.side);
    this.passes = 0;
    this.drawsThisTurn = 0;
    this.lastAction = { type: 'play', playerId, tile };

    if (this.bots[playerId]) {
      this._recordPlayedTile(tile);
    }

    if (this.hands[playerId].length === 0) {
      this._endRound('domino', playerId);
      return { ok: true };
    }

    this._advanceTurn();
    return { ok: true };
  }

  drawFromPool(playerId) {
    if (!this.hasPool) {
      return { ok: false, error: 'Esta modalidad no tiene pozo' };
    }
    if (this.status !== 'playing') {
      return { ok: false, error: 'La partida no está activa' };
    }
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) {
      return { ok: false, error: 'No es tu turno' };
    }
    if (this.getValidMoves(playerId).length > 0) {
      return { ok: false, error: 'Tienes jugadas disponibles, no puedes robar' };
    }
    if (this.pool.length === 0) {
      return { ok: false, error: 'El pozo está vacío' };
    }

    const tile = this.pool.pop();
    const hand = this.hands[playerId];
    hand.push(tile[0] <= tile[1] ? tile : [tile[1], tile[0]]);
    this.drawsThisTurn++;
    this.lastAction = { type: 'draw', playerId, tile };
    return { ok: true, tile: hand[hand.length - 1] };
  }

  pass(playerId) {
    if (this.status !== 'playing') {
      return { ok: false, error: 'La partida no está activa' };
    }
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) {
      return { ok: false, error: 'No es tu turno' };
    }
    const moves = this.getValidMoves(playerId);
    if (moves.length > 0) {
      return { ok: false, error: 'Tienes jugadas disponibles, no puedes pasar' };
    }
    if (this.hasPool && this.pool.length > 0) {
      return { ok: false, error: 'Aún hay fichas en el pozo, debes robar' };
    }

    this.passes++;
    this.drawsThisTurn = 0;
    this.lastAction = { type: 'pass', playerId };

    if (this.passes >= this.players.length) {
      this._endRound('blocked', null);
      return { ok: true, blocked: true };
    }

    this._advanceTurn();
    return { ok: true };
  }

  _placeTile(tile, side) {
    if (!this.ends) {
      this.board.push({ tile, side: 'first' });
      this.ends = { left: tile[0], right: tile[1] };
      return;
    }

    if (side === 'left') {
      if (tile[0] === this.ends.left) {
        this.board.unshift({ tile: [tile[1], tile[0]], side });
        this.ends.left = tile[1];
      } else if (tile[1] === this.ends.left) {
        this.board.unshift({ tile, side });
        this.ends.left = tile[0];
      }
    } else if (side === 'right') {
      if (tile[1] === this.ends.right) {
        this.board.push({ tile: [tile[1], tile[0]], side });
        this.ends.right = tile[0];
      } else if (tile[0] === this.ends.right) {
        this.board.push({ tile, side });
        this.ends.right = tile[1];
      }
    } else if (side === 'first') {
      this.board.push({ tile, side });
      this.ends = { left: tile[0], right: tile[1] };
    }
  }

  _recordPlayedTile(tile) {
    this.players.forEach((p) => {
      if (this.bots[p.id]) {
        const m = this.bots[p.id].memory;
        m.playedTiles.push(tile[0] <= tile[1] ? tile : [tile[1], tile[0]]);
        m.remainingByNumber[tile[0]]--;
        m.remainingByNumber[tile[1]]--;
      }
    });
  }

  _advanceTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  _endRound(reason, winnerId) {
    this.status = 'round-end';
    this.endReason = reason;
    if (reason === 'domino') {
      this.winner = winnerId;
      const winnerPlayer = this.players.find((p) => p.id === winnerId);
      this.winningTeam = winnerPlayer.team;
      const totalPips = this.players.reduce(
        (sum, p) => sum + this.hands[p.id].reduce((s, t) => s + tilePips(t), 0),
        0
      );
      this.roundPoints = totalPips;
      this.teamScores[this.winningTeam] += totalPips;
    } else if (reason === 'blocked') {
      const teamPips = { 1: 0, 2: 0 };
      this.players.forEach((p) => {
        teamPips[p.team] += this.hands[p.id].reduce(
          (s, t) => s + tilePips(t),
          0
        );
      });
      if (teamPips[1] < teamPips[2]) {
        this.winningTeam = 1;
        this.roundPoints = teamPips[2] - teamPips[1];
      } else if (teamPips[2] < teamPips[1]) {
        this.winningTeam = 2;
        this.roundPoints = teamPips[1] - teamPips[2];
      } else {
        this.winningTeam = 0;
        this.roundPoints = 0;
      }
      if (this.winningTeam !== 0) {
        this.teamScores[this.winningTeam] += this.roundPoints;
      }
    }

    if (this.teamScores[1] >= WINNING_SCORE || this.teamScores[2] >= WINNING_SCORE) {
      this.status = 'game-over';
    }
  }

  startNextRound() {
    if (this.status !== 'round-end') return false;
    this.board = [];
    this.ends = null;
    this.passes = 0;
    this.lastAction = null;
    this.endReason = null;
    this.winner = null;
    this.winningTeam = null;
    this.drawsThisTurn = 0;

    this._deal();
    this._setupBots();

    if (this.winningTeam && this.winningTeam !== 0) {
      const winningPlayerIdx = this.players.findIndex(
        (p) => p.team === this.winningTeam
      );
      this.currentPlayerIndex = winningPlayerIdx;
      this.roundStarterIndex = winningPlayerIdx;
    } else {
      this._determineStarter();
    }

    this.status = 'playing';
    return true;
  }

  getStateForPlayer(playerId) {
    const validMoves = this.getValidMoves(playerId);
    return {
      roomCode: this.roomCode,
      mode: this.mode,
      hasPool: this.hasPool,
      poolCount: this.pool.length,
      status: this.status,
      round: this.round,
      teamScores: this.teamScores,
      winningTeam: this.winningTeam,
      roundPoints: this.roundPoints,
      endReason: this.endReason,
      lastAction: this.lastAction,
      currentPlayerId: this.getCurrentPlayer()?.id,
      board: this.board,
      ends: this.ends,
      myHand: this.hands[playerId] || [],
      handCounts: this.players.reduce((acc, p) => {
        acc[p.id] = (this.hands[p.id] || []).length;
        return acc;
      }, {}),
      players: this.players.map((p) => ({
        id: p.id,
        username: p.username,
        isBot: p.isBot,
        team: p.team,
        seat: p.seat
      })),
      validMoves: validMoves.map((m) => ({
        index: m.index,
        tile: m.tile,
        side: m.side
      })),
      canPlay: validMoves.length > 0,
      canDraw: this.hasPool && validMoves.length === 0 && this.pool.length > 0,
      canPass: validMoves.length === 0 && (!this.hasPool || this.pool.length === 0)
    };
  }
}
