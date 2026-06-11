import { DominoGame } from './DominoGame.js';

const game = new DominoGame({
  roomCode: 'TTEST',
  mode: '1v1',
  players: [
    { id: 'p1', username: 'A', isBot: false },
    { id: 'p2', username: 'B', isBot: false }
  ]
});

// Case 1: End tile is vertical normal, playing a double
game.board = [{
  tile: [5, 4],
  side: 'first',
  x: 10,
  y: 10,
  x2: 10,
  y2: 11,
  orientation: 'vertical'
}];
game.ends = { left: 5, right: 4 };

console.log('Case 1: Vertical normal [5|4] (left end is 5), playing double [5|5] on left:');
console.log(game.getValidPlacementsForTile([5, 5], 'left'));

// Case 2: End tile is vertical double, playing normal
game.board = [{
  tile: [5, 5],
  side: 'first',
  x: 10,
  y: 10,
  x2: 10,
  y2: 11,
  orientation: 'vertical'
}];
game.ends = { left: 5, right: 5 };

console.log('\nCase 2: Vertical double [5|5] (left end is 5), playing normal [5|4] on left:');
console.log(game.getValidPlacementsForTile([5, 4], 'left'));
