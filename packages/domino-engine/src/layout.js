export const DEFAULT_LAYOUT = { grid: 20, cell: 32, rowStep: 3 };

const minX = (t) => Math.min(t.x, t.x2);
const minY = (t) => Math.min(t.y, t.y2);
const maxX = (t) => Math.max(t.x, t.x2);

const esDoble = (t) => t[0] === t[1];

/**
 * El doble se cruza sobre la fila, asi que se lo sube media celda para que
 * quede centrado en la linea. Es un ajuste por ficha y no se acumula: el dibujo
 * nunca se desvia de la cuadricula.
 */
export function computeBoardOffsets(board, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0) return [];
  const medio = layout.cell / 2;
  return board.map((t) => (t.orientation === 'vertical' ? { x: 0, y: -medio } : { x: 0, y: 0 }));
}

export function anchorOffsetFor(board, placement, layout = DEFAULT_LAYOUT) {
  const medio = layout.cell / 2;
  return placement.orientation === 'vertical' ? { x: 0, y: -medio } : { x: 0, y: 0 };
}

export function rectOf(placed, offset, cell) {
  const w = placed.orientation === 'horizontal' ? cell * 2 : cell;
  const h = placed.orientation === 'horizontal' ? cell : cell * 2;
  return {
    left: minX(placed) * cell + offset.x,
    top: minY(placed) * cell + offset.y,
    width: w,
    height: h
  };
}

export function boardEnds(board) {
  if (!board || board.length === 0) return null;
  return { left: board[0].tile[0], right: board[board.length - 1].tile[1] };
}

/**
 * La primera ficha de la mano es la unica que se juega con el tablero vacio.
 * La cadena crece hacia los dos lados a partir de ella.
 */
function indiceSpinner(board) {
  const i = board.findIndex((t) => t.side === 'first');
  return i === -1 ? 0 : i;
}

/**
 * Recorre una mitad de la cadena en serpentina y devuelve donde cae cada ficha.
 *
 * La mitad derecha avanza hacia la derecha y baja de fila; la izquierda avanza
 * hacia la izquierda y sube. Cada mitad vive en su propia franja del tablero,
 * asi que nunca se cruzan entre si ni consigo mismas, y una ficha ya puesta no
 * se mueve nunca.
 *
 * Devuelve null solo si de verdad se acabo el tablero.
 */
function recorrer(fichas, inicioX, fila, layout, haciaAbajo) {
  const grid = layout.grid;
  const paso = layout.rowStep || 3;
  let x = inicioX;
  let y = fila;
  let dir = haciaAbajo ? 1 : -1;
  const puestas = [];

  for (const t of fichas) {
    const ancho = esDoble(t) ? 1 : 2;
    let lo = dir === 1 ? x : x - ancho + 1;
    let hi = dir === 1 ? x + ancho - 1 : x;

    if (lo < 0 || hi > grid - 1) {
      y += (haciaAbajo ? 1 : -1) * paso;
      dir = -dir;
      x = dir === 1 ? 0 : grid - 1;
      lo = dir === 1 ? x : x - ancho + 1;
      hi = dir === 1 ? x + ancho - 1 : x;
    }
    if (y < 0 || y + 1 > grid - 1) return null;

    puestas.push({ lo, hi, y, dir, doble: esDoble(t) });
    x += dir * ancho;
  }
  return puestas;
}

/**
 * `tile[0]` va siempre con la celda `(x, y)` y `tile[1]` con `(x2, y2)`, porque
 * `boardEnds` lee los extremos de ahi. Del lado izquierdo la punta libre es
 * `tile[0]`, del derecho es `tile[1]`.
 */
function aColocacion(hueco, valores, side) {
  const [a, b] = valores;
  const vertical = hueco.doble;

  const cerca = vertical
    ? { x: hueco.lo, y: hueco.y }
    : { x: hueco.dir === 1 ? hueco.lo : hueco.hi, y: hueco.y };
  const lejos = vertical
    ? { x: hueco.lo, y: hueco.y + 1 }
    : { x: hueco.dir === 1 ? hueco.hi : hueco.lo, y: hueco.y };

  const punta = side === 'left' ? lejos : cerca;
  const cola = side === 'left' ? cerca : lejos;

  return {
    tile: [a, b],
    x: punta.x,
    y: punta.y,
    x2: cola.x,
    y2: cola.y,
    orientation: vertical ? 'vertical' : 'horizontal',
    side
  };
}

/**
 * Donde va la ficha. Devuelve como mucho una posicion por lado: el lugar no es
 * una decision de domino, la regla solo dice extremo izquierdo o derecho.
 *
 * Antes el jugador elegia el punto exacto y la cadena terminaba enrollandose
 * sobre si misma: medido, en el 25% de los turnos trancados el jugador tenia
 * una ficha buena sin lugar donde ponerla, y el 83.6% de esos rechazos eran
 * choques de la cadena consigo misma (ver contexto/README.md 42). Con el
 * trazado en serpentina eso no puede pasar.
 */
export function placementsFor(board, tile, side, layout = DEFAULT_LAYOUT, diagnostico = null) {
  const grid = layout.grid;
  const anotar = (motivo) => { if (diagnostico) diagnostico.push({ motivo }); };

  if (!board || board.length === 0) {
    if (side !== 'first') return [];
    const c = Math.floor(grid / 2) - 1;
    return [esDoble(tile)
      ? { tile: [tile[0], tile[1]], x: c, y: c, x2: c, y2: c + 1, orientation: 'vertical', side: 'first' }
      : { tile: [tile[0], tile[1]], x: c, y: c, x2: c + 1, y2: c, orientation: 'horizontal', side: 'first' }];
  }

  if (side !== 'left' && side !== 'right') return [];

  const ev = side === 'left' ? board[0].tile[0] : board[board.length - 1].tile[1];
  if (tile[0] !== ev && tile[1] !== ev) {
    anotar('no-coincide-con-el-extremo');
    return [];
  }

  const outerVal = tile[0] === ev ? tile[1] : tile[0];
  const valores = side === 'left' ? [outerVal, ev] : [ev, outerVal];

  const s = indiceSpinner(board);
  const spin = board[s];
  const fila = minY(spin);
  const haciaAbajo = side === 'right';
  const inicioX = haciaAbajo ? maxX(spin) + 1 : minX(spin) - 1;

  const previas = haciaAbajo ? board.slice(s + 1) : board.slice(0, s).reverse();
  const secuencia = [...previas.map((t) => t.tile), valores];

  const puestas = recorrer(secuencia, inicioX, fila, layout, haciaAbajo);
  if (!puestas) {
    anotar('no-cabe-en-la-mesa');
    return [];
  }

  const p = aColocacion(puestas[puestas.length - 1], valores, side);
  if (diagnostico) diagnostico.push({ ...p, motivo: null });
  return [p];
}

export function placementKey(p) {
  return `${p.x},${p.y},${p.x2},${p.y2},${p.orientation}`;
}

export function straightestPlacement(board, placements) {
  return placements && placements.length ? placements[0] : null;
}

export function explainPlacements(board, tile, side, layout = DEFAULT_LAYOUT) {
  const diagnostico = [];
  const validas = placementsFor(board, tile, side, layout, diagnostico);
  return { validas, candidatas: diagnostico };
}
