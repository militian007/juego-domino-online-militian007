import { isDouble, tilePips, sortTile } from './Tile.js';

export class Bot {
  constructor(game, playerId) {
    this.game = game;
    this.playerId = playerId;
    this.memory = game.bots[playerId]?.memory || {
      playedTiles: [],
      remainingByNumber: this._initialCount()
    };
  }

  _initialCount() {
    const counts = {};
    for (let i = 0; i <= 6; i++) counts[i] = 7;
    return counts;
  }

  _partner() {
    const me = this.game.players.find((p) => p.id === this.playerId);
    if (me.team == null) return null;
    return this.game.players.find(
      (p) => p.team === me.team && p.id !== this.playerId
    );
  }

  _opponents() {
    const me = this.game.players.find((p) => p.id === this.playerId);
    return this.game.players.filter((p) => p.team !== me.team);
  }

  _nextPlayer() {
    const idx = this.game.currentPlayerIndex;
    return this.game.players[(idx + 1) % this.game.players.length];
  }

  _handPips(hand) {
    return hand.reduce((s, t) => s + tilePips(t), 0);
  }

  chooseMove() {
    const validMoves = this.game.getValidMoves(this.playerId);
    if (validMoves.length === 0) return null;

    const winningMove = validMoves.find((m) => m.handAfter.length === 0);
    if (winningMove) {
      return { tileIndex: winningMove.index, side: winningMove.side };
    }

    const scored = validMoves.map((move) => ({
      ...move,
      score: this._scoreMove(move)
    }));
    scored.sort((a, b) => b.score - a.score);
    return { tileIndex: scored[0].index, side: scored[0].side };
  }

  _scoreMove(move) {
    let score = 0;
    const myHand = this.game.hands[this.playerId];
    const handAfter = move.handAfter;
    const myPipsAfter = this._handPips(handAfter);

    score += (myPipsAfter - this._handPips(myHand)) * -3;

    const newEnds = this._simulateEnds(move);
    if (newEnds.left === newEnds.right) {
      const n = newEnds.left;
      if (this.memory.remainingByNumber[n] <= 1) {
        score += 8;
      }
    }

    const partner = this._partner();
    if (partner && this.game.hands[partner.id]) {
      const partnerPips = this._handPips(this.game.hands[partner.id]);
      if (partnerPips <= 5 && myPipsAfter <= partnerPips) {
        score += 6;
      }
    }

    const next = this._nextPlayer();
    if (next && next.id !== this.playerId) {
      const nextHandSize = (this.game.hands[next.id] || []).length;
      if (nextHandSize <= 2) {
        const playedValue = tilePips(move.tile);
        if (playedValue >= 6) score += 4;
      }
    }

    if (isDouble(move.tile)) {
      score += 1;
    }

    return score;
  }

  _simulateEnds(move) {
    const ends = this.game.ends;
    if (!ends) return { left: move.tile[0], right: move.tile[1] };

    if (move.side === 'left') {
      if (move.tile[0] === ends.left) return { left: move.tile[1], right: ends.right };
      return { left: move.tile[0], right: ends.right };
    }
    if (move.side === 'right') {
      if (move.tile[1] === ends.right) return { left: ends.left, right: move.tile[0] };
      return { left: ends.left, right: move.tile[1] };
    }
    return ends;
  }
}
