// CUANTO MIDE LA FICHA EN EL TELEFONO (seccion 207). Raul: «se pone muy
// pequeño». Se juegan partidas con bots y, despues de cada jugada, se calcula
// con la MISMA camara de la mesa (Board.jsx) cuanto mediria la ficha en un
// telefono de 390x844: el paño libre medido con la bateria es 330x304 en el
// 1 vs 1 y 242x304 en el 2 vs 2 (las placas de los costados comen 52 px).
//
// Uso:  node src/medir-encuadre.js [partidas por modo] [ventana1v1] [ventana2v2]
//       ventana = «ANCHOxALTO» en celdas, o «vieja» para la 9x14 de siempre.
import { DominoGame } from './game/DominoGame.js';
import { Bot } from './game/Bot.js';
import { computeBoardOffsets, placementsFor, casillasQueVienen } from '@privoytruco/domino-engine/layout';
const CAMARA = process.env.CAMARA || 'puntas';

const N = Number(process.argv[2] || 300);
const leer = (t, porDefecto) => {
  const crudo = t || porDefecto;
  if (crudo === 'vieja') return null;
  const [ancho, alto] = crudo.split('x').map(Number);
  return { ancho, alto };
};
const VENTANAS = { '1v1': leer(process.argv[3], 'mesa'), '2v2': leer(process.argv[4], 'mesa') };
const PANO = { '1v1': [330, 304], '2v2': [242, 304] };

const ALTO_MAXIMO_FICHA = 0.11;
const ALTO_MINIMO_FICHA = 0.035;
const ALCANCE_PUNTA = 2.0;
const AIRE_CELDAS = 0.5;

function largoDeFicha(board, layout, [W, H]) {
  const CELL = layout.cell;
  const offs = computeBoardOffsets(board, layout);
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  const caja = (i) => {
    const pos = board[i]; const o = offs[i] ?? { x: 0, y: 0 };
    const a = pos.orientation === 'horizontal' ? 2 : 1; const h = pos.orientation === 'horizontal' ? 1 : 2;
    const l = Math.min(pos.x, pos.x2) + o.x / CELL; const t = Math.min(pos.y, pos.y2) + o.y / CELL;
    return { x1: l, x2: l + a, y1: t, y2: t + h };
  };
  board.forEach((_, i) => { const c = caja(i); x1 = Math.min(x1, c.x1); x2 = Math.max(x2, c.x2); y1 = Math.min(y1, c.y1); y2 = Math.max(y2, c.y2); });
  let ex1, ex2, ey1, ey2;
  if (CAMARA === 'puntas') {
    ex1 = x1; ex2 = x2; ey1 = y1; ey2 = y2;
    for (const c of casillasQueVienen(board, layout)) {
      ex1 = Math.min(ex1, c.x1); ex2 = Math.max(ex2, c.x2); ey1 = Math.min(ey1, c.y1); ey2 = Math.max(ey2, c.y2);
    }
    ex1 -= AIRE_CELDAS; ex2 += AIRE_CELDAS; ey1 -= AIRE_CELDAS; ey2 += AIRE_CELDAS;
  } else {
    const a = caja(0), b = caja(board.length - 1);
    ex1 = Math.min(x1, Math.min(a.x1, b.x1) - ALCANCE_PUNTA) - AIRE_CELDAS;
    ex2 = Math.max(x2, Math.max(a.x2, b.x2) + ALCANCE_PUNTA) + AIRE_CELDAS;
    ey1 = Math.min(y1, Math.min(a.y1, b.y1) - ALCANCE_PUNTA) - AIRE_CELDAS;
    ey2 = Math.max(y2, Math.max(a.y2, b.y2) + ALCANCE_PUNTA) + AIRE_CELDAS;
  }
  const menor = Math.min(W, H);
  const maxima = (menor * ALTO_MAXIMO_FICHA) / CELL;
  const minima = (menor * ALTO_MINIMO_FICHA) / CELL;
  const cabe = Math.min(W / ((ex2 - ex1) * CELL), H / ((ey2 - ey1) * CELL));
  const escala = Math.min(Math.max(cabe, minima), maxima);
  return 2 * CELL * escala;
}

const salida = {};
for (const mode of ['1v1', '2v2']) {
  const largos = [];
  const porTramo = { '1-6': [], '7-12': [], '13-18': [], '19+': [] };
  let destranques = 0, sinCasilla = 0, jugadas = 0;
  for (let g = 0; g < N; g += 1) {
    const n = mode === '1v1' ? 2 : 4;
    const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, username: `P${i}`, isBot: true, difficulty: 'normal' }));
    const game = new DominoGame({ roomCode: 'E', mode, players, seed: g * 7919 + (mode === '1v1' ? 3 : 5) });
    const layout = { ...game.state.config.layout };
    if (VENTANAS[mode]) layout.ventana = VENTANAS[mode]; else delete layout.ventana;
    game.state.config.layout = layout;
    let v = 0;
    while (game.status === 'playing' && v++ < 4000) {
      if (game.destrancarSiHaceFalta()) destranques += 1;
      const s = game.state; const seat = s.turn;
      if (s.board.length > 0) {
        for (const tile of s.hands[seat]) for (const side of ['left', 'right']) {
          const end = side === 'left' ? s.ends.left : s.ends.right;
          if (tile[0] !== end && tile[1] !== end) continue;
          if (placementsFor(s.board, tile, side, s.config.layout, null, { sinParedes: true }).length === 0) sinCasilla += 1;
        }
      }
      const a = game.getCurrentPlayer(); const val = game.getValidMoves(a.id);
      const antes = s.board.length;
      if (val.length) { const m = new Bot(game, a.id, 'normal').chooseMove(); if (m) { const c = m.placement || {}; game.playTile(a.id, m.tileIndex, m.side, c.x, c.y, c.x2, c.y2, c.orientation); } else game.pass(a.id); }
      else if (game.hasPool && game.pool.length) { if (!game.drawFromPool(a.id).ok) game.pass(a.id); } else game.pass(a.id);
      const b = game.state.board;
      if (game.status === 'playing' && b.length > antes && b.length > 1) {
        jugadas += 1;
        const l = largoDeFicha(b, game.state.config.layout, PANO[mode]);
        largos.push(l);
        const k = b.length <= 6 ? '1-6' : b.length <= 12 ? '7-12' : b.length <= 18 ? '13-18' : '19+';
        porTramo[k].push(l);
      }
    }
  }
  const prom = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const ordenados = [...largos].sort((a, b) => a - b);
  salida[mode] = {
    camara: CAMARA,
    ventana: VENTANAS[mode] ? `${VENTANAS[mode].ancho}x${VENTANAS[mode].alto}` : 'vieja 9x14',
    jugadas,
    promedio: prom(largos),
    peor10: Math.round(ordenados[Math.floor(ordenados.length * 0.1)] * 10) / 10,
    debajoDe40: `${((ordenados.filter((x) => x < 40).length / ordenados.length) * 100).toFixed(1)} %`,
    porTramo: Object.fromEntries(Object.entries(porTramo).map(([k, xs]) => [k, prom(xs)])),
    destranques,
    sinCasilla
  };
}
console.log(JSON.stringify(salida, null, 1));
