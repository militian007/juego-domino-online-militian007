export const DEFAULT_LAYOUT = { grid: 20, cell: 32 };

const minX = (t) => Math.min(t.x, t.x2);
const minY = (t) => Math.min(t.y, t.y2);
const maxX = (t) => Math.max(t.x, t.x2);
const maxY = (t) => Math.max(t.y, t.y2);

function center(t, cell) {
  const half = cell / 2;
  if (t.orientation === 'horizontal') {
    return { x: minX(t) * cell + cell, y: minY(t) * cell + half };
  }
  return { x: minX(t) * cell + half, y: minY(t) * cell + cell };
}

function joinOffset(prev, curr, prevOffset, cell) {
  const prevDouble = prev.tile[0] === prev.tile[1];
  const currDouble = curr.tile[0] === curr.tile[1];
  if (prev.orientation === curr.orientation || (!prevDouble && !currDouble)) {
    return { x: prevOffset.x, y: prevOffset.y };
  }
  const pc = center(prev, cell);
  const cc = center(curr, cell);
  const theDouble = currDouble ? curr : prev;
  if (theDouble.orientation === 'vertical') {
    return { x: prevOffset.x, y: prevOffset.y + pc.y - cc.y };
  }
  return { x: prevOffset.x + pc.x - cc.x, y: prevOffset.y };
}

export function computeBoardOffsets(board, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0) return [];
  const cell = layout.cell;
  const offsets = new Array(board.length);
  const firstIdx = board.findIndex((t) => t.side === 'first');
  const start = firstIdx !== -1 ? firstIdx : 0;
  offsets[start] = { x: 0, y: 0 };
  for (let i = start + 1; i < board.length; i++) {
    offsets[i] = joinOffset(board[i - 1], board[i], offsets[i - 1], cell);
  }
  for (let i = start - 1; i >= 0; i--) {
    offsets[i] = joinOffset(board[i + 1], board[i], offsets[i + 1], cell);
  }
  return offsets;
}

export function anchorOffsetFor(board, placement, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0) return { x: 0, y: 0 };
  const offsets = computeBoardOffsets(board, layout);
  const idx = placement.side === 'left' ? 0 : board.length - 1;
  return joinOffset(board[idx], placement, offsets[idx] || { x: 0, y: 0 }, layout.cell);
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

function overlaps(a, b) {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

export function boardEnds(board) {
  if (!board || board.length === 0) return null;
  return { left: board[0].tile[0], right: board[board.length - 1].tile[1] };
}

export function placementsFor(board, tile, side, layout = DEFAULT_LAYOUT) {
  const GRID = layout.grid;
  const cell = layout.cell;
  const out = [];

  if (!board || board.length === 0) {
    if (side !== 'first') return [];
    const cx = Math.floor(GRID / 2);
    const cy = Math.floor(GRID / 2);
    return [
      { tile: [tile[0], tile[1]], x: cx, y: cy, x2: cx + 1, y2: cy, orientation: 'horizontal', side: 'first' },
      { tile: [tile[0], tile[1]], x: cx, y: cy, x2: cx, y2: cy + 1, orientation: 'vertical', side: 'first' }
    ];
  }

  let endTile;
  let ex;
  let ey;
  let ev;
  if (side === 'left') {
    endTile = board[0];
    ex = endTile.x;
    ey = endTile.y;
    ev = endTile.tile[0];
  } else if (side === 'right') {
    endTile = board[board.length - 1];
    ex = endTile.x2;
    ey = endTile.y2;
    ev = endTile.tile[1];
  } else {
    return [];
  }

  if (tile[0] !== ev && tile[1] !== ev) return [];

  const connVal = ev;
  const outerVal = tile[0] === ev ? tile[1] : tile[0];

  const occupied = new Set();
  const ownerOf = new Map();
  board.forEach((t, i) => {
    for (const k of [t.x + ',' + t.y, t.x2 + ',' + t.y2]) {
      occupied.add(k);
      ownerOf.set(k, i);
    }
  });

  const offsets = computeBoardOffsets(board, layout);
  const anchorIdx = side === 'left' ? 0 : board.length - 1;
  const anchor = board[anchorIdx];
  const anchorOffset = offsets[anchorIdx] || { x: 0, y: 0 };

  const add = (p) => {
    const pMinX = minX(p);
    const pMinY = minY(p);
    const pMaxX = maxX(p);
    const pMaxY = maxY(p);

    if (pMinX < 0 || pMaxX >= GRID || pMinY < 0 || pMaxY >= GRID) return;
    if ((pMinX < 1 || pMaxX >= GRID - 1) && p.orientation !== 'vertical') return;
    if ((pMinY < 1 || pMaxY >= GRID - 1) && p.orientation !== 'horizontal') return;

    if (occupied.has(p.x + ',' + p.y) || occupied.has(p.x2 + ',' + p.y2)) return;

    // La ficha nueva solo puede tocar a la ficha con la que engancha. Si roza
    // cualquier otra, la cadena se esta doblando sobre si misma y queda amontonada.
    for (const [cx, cy] of [[p.x, p.y], [p.x2, p.y2]]) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const owner = ownerOf.get(cx + dx + ',' + (cy + dy));
        if (owner !== undefined && owner !== anchorIdx) return;
      }
    }

    const offset = joinOffset(anchor, p, anchorOffset, cell);
    const pRect = rectOf(p, offset, cell);
    for (let i = 0; i < board.length; i++) {
      if (overlaps(pRect, rectOf(board[i], offsets[i] || { x: 0, y: 0 }, cell))) return;
    }

    out.push(p);
  };

  const endIsDouble = endTile.tile[0] === endTile.tile[1];

  const sideTile = side === 'left' ? [outerVal, connVal] : [connVal, outerVal];

  const addAlong = (orientation, nearCell, farCell) => {
    const near = side === 'left' ? farCell : nearCell;
    const far = side === 'left' ? nearCell : farCell;
    add({
      tile: [sideTile[0], sideTile[1]],
      x: near.x,
      y: near.y,
      x2: far.x,
      y2: far.y,
      orientation,
      side
    });
  };

  if (endIsDouble) {
    if (endTile.orientation === 'horizontal') {
      const bx = minX(endTile);
      const rx = maxX(endTile);
      if (side === 'left') {
        add({ tile: [outerVal, connVal], x: bx, y: ey - 2, x2: bx, y2: ey - 1, orientation: 'vertical', side });
      } else {
        add({ tile: [connVal, outerVal], x: bx, y: ey + 1, x2: bx, y2: ey + 2, orientation: 'vertical', side });
      }
      if (ey <= 1 || ey >= GRID - 2) {
        addAlong('horizontal', { x: bx - 1, y: ey }, { x: bx - 2, y: ey });
        addAlong('horizontal', { x: rx + 1, y: ey }, { x: rx + 2, y: ey });
      }
    } else {
      const by = minY(endTile);
      const ry = maxY(endTile);
      if (side === 'left') {
        add({ tile: [outerVal, connVal], x: ex - 2, y: by, x2: ex - 1, y2: by, orientation: 'horizontal', side });
      } else {
        add({ tile: [connVal, outerVal], x: ex + 1, y: by, x2: ex + 2, y2: by, orientation: 'horizontal', side });
      }
      if (ex <= 1 || ex >= GRID - 2) {
        addAlong('vertical', { x: ex, y: by - 1 }, { x: ex, y: by - 2 });
        addAlong('vertical', { x: ex, y: ry + 1 }, { x: ex, y: ry + 2 });
      }
    }
  } else {
    // La punta libre del extremo puede apuntar en cualquiera de las 4 direcciones:
    // la direccion "recta" sale de la geometria de la propia ficha, no del lado de la cadena.
    const body = side === 'left'
      ? { x: endTile.x2, y: endTile.y2 }
      : { x: endTile.x, y: endTile.y };
    const free = { x: ex, y: ey };
    const dx = free.x - body.x;
    const dy = free.y - body.y;

    if (tile[0] === tile[1]) {
      // Doble: se cruza perpendicular a la cadena. Puede sobresalir hacia un
      // lado o hacia el otro de la linea, igual que en una mesa de verdad.
      // Ofrecer una sola de las dos dejaba dobles injugables sin motivo.
      if (endTile.orientation === 'horizontal') {
        const col = free.x + dx;
        addAlong('vertical', { x: col, y: ey }, { x: col, y: ey - 1 });
        addAlong('vertical', { x: col, y: ey }, { x: col, y: ey + 1 });
      } else {
        const row = free.y + dy;
        addAlong('horizontal', { x: ex, y: row }, { x: ex - 1, y: row });
        addAlong('horizontal', { x: ex, y: row }, { x: ex + 1, y: row });
      }
    } else {
      // 1. Recta: sigue hacia donde apunta la punta libre
      addAlong(
        endTile.orientation,
        { x: free.x + dx, y: free.y + dy },
        { x: free.x + 2 * dx, y: free.y + 2 * dy }
      );

      // 2 y 3. Giros: perpendicular, pivotando sobre la punta libre
      if (endTile.orientation === 'horizontal') {
        addAlong('vertical', { x: free.x, y: free.y - 1 }, { x: free.x, y: free.y - 2 });
        addAlong('vertical', { x: free.x, y: free.y + 1 }, { x: free.x, y: free.y + 2 });
      } else {
        addAlong('horizontal', { x: free.x - 1, y: free.y }, { x: free.x - 2, y: free.y });
        addAlong('horizontal', { x: free.x + 1, y: free.y }, { x: free.x + 2, y: free.y });
      }
    }
  }

  const seen = new Set();
  const unique = [];
  for (const p of out) {
    const k = minX(p) + ',' + minY(p) + ',' + p.orientation;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(p);
  }
  return unique;
}

export function placementKey(p) {
  return [p.x, p.y, p.x2, p.y2, p.orientation].join(',');
}


export function straightestPlacement(board, placements, side) {
  if (!placements || placements.length === 0) return null;
  if (!board || board.length === 0) return placements[0];
  const endTile = side === 'left' ? board[0] : board[board.length - 1];
  const dx = side === 'left' ? endTile.x - endTile.x2 : endTile.x2 - endTile.x;
  const dy = side === 'left' ? endTile.y - endTile.y2 : endTile.y2 - endTile.y;
  const ex = side === 'left' ? endTile.x : endTile.x2;
  const ey = side === 'left' ? endTile.y : endTile.y2;
  const cx = ex + dx;
  const cy = ey + dy;
  const cx2 = cx + dx;
  const cy2 = cy + dy;
  const straight = placements.find((p) =>
    side === 'left'
      ? p.x === cx2 && p.y === cy2 && p.x2 === cx && p.y2 === cy
      : p.x === cx && p.y === cy && p.x2 === cx2 && p.y2 === cy2
  );
  return straight || placements[0];
}
