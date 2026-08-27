import { chooseAction, viewFor } from '@privoytruco/domino-engine';

export class Bot {
  constructor(game, playerId, difficulty = 'normal') {
    this.game = game;
    this.playerId = playerId;
    this.difficulty = difficulty;
  }

  _seat() {
    return this.game.players.findIndex((p) => p.id === this.playerId);
  }

  chooseMove() {
    const seat = this._seat();
    if (seat === -1) return null;
    const view = viewFor(this.game.state, seat);
    const action = chooseAction(view, { difficulty: this.difficulty });
    if (!action || action.type !== 'PLAY_TILE') return null;
    return {
      tileIndex: action.tileIndex,
      side: action.side,
      placement: action.placement
    };
  }
}
