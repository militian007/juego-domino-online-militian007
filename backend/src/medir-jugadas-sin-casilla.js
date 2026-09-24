// NINGUNA JUGADA LEGAL SIN CASILLA (seccion 206). Raul: «no puede pasar que no te
// deje jugar lo que quieras jugar». Se juegan partidas con bots y, en cada turno,
// se prueba cada ficha de la mano por cada punta que le pega: tiene que tener
// casilla SIEMPRE. `sinCasilla` tiene que dar 0.
//
// Uso:  node src/medir-jugadas-sin-casilla.js [partidas por modo] [semilla]
import { DominoGame } from './game/DominoGame.js';
import { Bot } from './game/Bot.js';
import { placementsFor } from '@privoytruco/domino-engine/layout';
const N = Number(process.argv[2] || 500);
let turnos = 0, jugadasLegales = 0, sinCasilla = 0, fueraDeLaPared = 0, destranques = 0;
const ejemplos = [];
for (const mode of ['1v1', '2v2']) {
  for (let g = 0; g < N; g += 1) {
    const n = mode === '1v1' ? 2 : 4;
    const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, username: `P${i}`, isBot: true, difficulty: 'normal' }));
    const game = new DominoGame({ roomCode: 'M', mode, players, seed: (g + Number(process.argv[3] || 0)) * 104729 + (mode === '1v1' ? 11 : 13) });
    let v = 0;
    while (game.status === 'playing' && v++ < 4000) {
      if (game.destrancarSiHaceFalta()) destranques += 1;
      const s = game.state; const seat = s.turn;
      if (s.board.length > 0) {
        turnos += 1;
        for (const tile of s.hands[seat]) for (const side of ['left', 'right']) {
          const end = side === 'left' ? s.ends.left : s.ends.right;
          if (tile[0] !== end && tile[1] !== end) continue;
          jugadasLegales += 1;
          const con = placementsFor(s.board, tile, side, s.config.layout, null, { sinParedes: true });
          const sin = placementsFor(s.board, tile, side, s.config.layout);
          if (con.length === 0) { sinCasilla += 1; if (ejemplos.length < 3) ejemplos.push({ mode, g, tile, side, fichas: s.board.length }); }
          else if (sin.length === 0) fueraDeLaPared += 1;
        }
      }
      const a = game.getCurrentPlayer(); const val = game.getValidMoves(a.id);
      if (val.length) { const m = new Bot(game, a.id, 'normal').chooseMove(); if (m) { const c = m.placement || {}; game.playTile(a.id, m.tileIndex, m.side, c.x, c.y, c.x2, c.y2, c.orientation); } else game.pass(a.id); }
      else if (game.hasPool && game.pool.length) { if (!game.drawFromPool(a.id).ok) game.pass(a.id); } else game.pass(a.id);
    }
  }
}
console.log(JSON.stringify({ partidas: N * 2, turnos, jugadasLegales, sinCasilla, fueraDeLaPared, destranques, ejemplos }));
