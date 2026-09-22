// LA CASA TORPE SUTIL (seccion 199): cuanto gana una persona normal contra cada nivel.
//
// Uso:  node src/medir-casa.js [partidas] [torpeza]   (por defecto 200 por nivel; torpeza 0.65)
//
// La "persona" es el bot `normal` del motor (juega bien sin ser maestro). Se
// la sienta contra cada dificultad, en 1v1 con pozo a 100 y en 2v2 a la
// tranca a 100 (con un companero `normal`), y se cuenta cuantas partidas gana.
// El numero que se busca es ~70 % para la persona: que gane mas de lo que
// pierde sin que se note que la casa se deja.
import { DominoGame } from './game/DominoGame.js';
import { Bot } from './game/Bot.js';
import { setCasaTorpeza } from '@privoytruco/domino-engine';

const PARTIDAS = Number(process.argv[2] || 200);
if (process.argv[3]) setCasaTorpeza(process.argv[3]);
const NIVELES = ['novato', 'facil', 'normal', 'dificil', 'maestro', 'casa'];

function jugar(mode, modalidad, niveles) {
  const players = niveles.map((d, i) => ({ id: `p${i}`, username: `P${i}`, isBot: true, difficulty: d }));
  const game = new DominoGame({ roomCode: 'SIM', mode, modalidad, players, seed: Math.floor(Math.random() * 1e9) });
  let vueltas = 0;
  while (game.status === 'playing' && vueltas < 5000) {
    vueltas += 1;
    const actual = game.getCurrentPlayer();
    const validas = game.getValidMoves(actual.id);
    if (validas.length > 0) {
      const move = new Bot(game, actual.id, actual.difficulty).chooseMove();
      if (move) {
        const c = move.placement || {};
        game.playTile(actual.id, move.tileIndex, move.side, c.x, c.y, c.x2, c.y2, c.orientation);
      } else game.pass(actual.id);
    } else if (game.hasPool && game.pool.length > 0) {
      if (!game.drawFromPool(actual.id).ok) game.pass(actual.id);
    } else game.pass(actual.id);
  }
  const s = game.teamScores;
  return s[1] > s[2] ? 1 : 2;
}

function medir(mode, modalidad, armar) {
  for (const nivel of NIVELES) {
    let gana = 0;
    for (let i = 0; i < PARTIDAS; i += 1) if (jugar(mode, modalidad, armar(nivel)) === 1) gana += 1;
    console.log(`  ${mode} ${modalidad.padEnd(6)} persona(normal) vs casa(${nivel.padEnd(7)}): la persona gana ${Math.round((100 * gana) / PARTIDAS)} %`);
  }
}

console.log(`Midiendo ${PARTIDAS} partidas por nivel...`);
medir('1v1', 'pozo', (n) => ['normal', n]);
medir('2v2', 'tranca', (n) => ['normal', n, 'normal', n]);
