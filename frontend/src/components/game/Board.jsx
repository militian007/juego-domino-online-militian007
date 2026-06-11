import { useEffect, useRef, useMemo } from 'react';
import Tile from './Tile.jsx';

const GRID_SIZE = 20;
const CELL_SIZE = 32;

const getCenter = (t) => {
  const minX = Math.min(t.x, t.x2);
  const minY = Math.min(t.y, t.y2);
  if (t.orientation === 'horizontal') {
    return { x: minX * CELL_SIZE + 32, y: minY * CELL_SIZE + 16 };
  } else {
    return { x: minX * CELL_SIZE + 16, y: minY * CELL_SIZE + 32 };
  }
};

function computeBoardOffsets(board) {
  if (!board || board.length === 0) return [];

  const offsets = new Array(board.length);
  const firstIdx = board.findIndex(t => t.side === 'first');
  const startIdx = firstIdx !== -1 ? firstIdx : 0;

  offsets[startIdx] = { x: 0, y: 0 };

  // Propagar a la derecha
  for (let i = startIdx + 1; i < board.length; i++) {
    const prev = board[i - 1];
    const curr = board[i];
    const prevOffset = offsets[i - 1];
    const prevIsDouble = prev.tile[0] === prev.tile[1];
    const currIsDouble = curr.tile[0] === curr.tile[1];

    if (prev.orientation !== curr.orientation && (prevIsDouble || currIsDouble)) {
      const prevCenter = getCenter(prev);
      const currCenter = getCenter(curr);
      const doubleTile = currIsDouble ? curr : prev;
      if (doubleTile.orientation === 'vertical') {
        offsets[i] = {
          x: prevOffset.x,
          y: prevOffset.y + prevCenter.y - currCenter.y
        };
      } else {
        offsets[i] = {
          x: prevOffset.x + prevCenter.x - currCenter.x,
          y: prevOffset.y
        };
      }
    } else {
      offsets[i] = { x: prevOffset.x, y: prevOffset.y };
    }
  }

  // Propagar a la izquierda
  for (let i = startIdx - 1; i >= 0; i--) {
    const prev = board[i + 1];
    const curr = board[i];
    const prevOffset = offsets[i + 1];
    const prevIsDouble = prev.tile[0] === prev.tile[1];
    const currIsDouble = curr.tile[0] === curr.tile[1];

    if (prev.orientation !== curr.orientation && (prevIsDouble || currIsDouble)) {
      const prevCenter = getCenter(prev);
      const currCenter = getCenter(curr);
      const doubleTile = currIsDouble ? curr : prev;
      if (doubleTile.orientation === 'vertical') {
        offsets[i] = {
          x: prevOffset.x,
          y: prevOffset.y + prevCenter.y - currCenter.y
        };
      } else {
        offsets[i] = {
          x: prevOffset.x + prevCenter.x - currCenter.x,
          y: prevOffset.y
        };
      }
    } else {
      offsets[i] = { x: prevOffset.x, y: prevOffset.y };
    }
  }

  return offsets;
}


function getValidPlacementsForTile(board, tile, side) {
  const placements = [];
  if (!board || board.length === 0) {
    if (side !== 'first') return [];
    const cx = Math.floor(GRID_SIZE / 2);
    const cy = Math.floor(GRID_SIZE / 2);
    placements.push({
      tile: [tile[0], tile[1]],
      x: cx,
      y: cy,
      x2: cx + 1,
      y2: cy,
      orientation: 'horizontal',
      side: 'first'
    });
    placements.push({
      tile: [tile[0], tile[1]],
      x: cx,
      y: cy,
      x2: cx,
      y2: cy + 1,
      orientation: 'vertical',
      side: 'first'
    });
    return placements;
  }

  let ex = 0;
  let ey = 0;
  let ev = 0;
  let endTile = null;

  if (side === 'left') {
    endTile = board[0];
    ex = endTile.x;
    ey = endTile.y;
    ev = endTile.tile[0];
  } else if (side === 'right') {
    const rightTile = board[board.length - 1];
    ex = rightTile.x2;
    ey = rightTile.y2;
    ev = rightTile.tile[1];
    endTile = rightTile;
  } else {
    return [];
  }

  if (tile[0] !== ev && tile[1] !== ev) return [];

  const connVal = ev;
  const outerVal = (tile[0] === ev) ? tile[1] : tile[0];

  const occupied = new Set();
  for (const t of board) {
    occupied.add(`${t.x},${t.y}`);
    occupied.add(`${t.x2},${t.y2}`);
  }

  const endIsDouble = endTile.tile[0] === endTile.tile[1];
  const boardOffsets = computeBoardOffsets(board);

  const addPlacementCandidate = (p) => {
    const minX = Math.min(p.x, p.x2);
    const minY = Math.min(p.y, p.y2);
    const maxX = Math.max(p.x, p.x2);
    const maxY = Math.max(p.y, p.y2);

    // 1. Grid boundary check
    if (minX < 0 || maxX >= GRID_SIZE || minY < 0 || maxY >= GRID_SIZE) return;
    // 2. Collision check
    if (occupied.has(`${p.x},${p.y}`) || occupied.has(`${p.x2},${p.y2}`)) return;

    // 3. Visual boundary check (taking propagation offsets into account)
    let offset = { x: 0, y: 0 };
    if (board && board.length > 0) {
      let prev, prevOffset;
      if (p.side === 'left') {
        prev = board[0];
        prevOffset = boardOffsets[0] || { x: 0, y: 0 };
      } else {
        prev = board[board.length - 1];
        prevOffset = boardOffsets[board.length - 1] || { x: 0, y: 0 };
      }

      const prevIsDouble = prev.tile[0] === prev.tile[1];
      const optIsDouble = p.tile[0] === p.tile[1];

      if (prev.orientation !== p.orientation && (prevIsDouble || optIsDouble)) {
        const prevCenter = getCenter(prev);
        const optCenter = getCenter(p);
        const doubleTile = optIsDouble ? p : prev;
        if (doubleTile.orientation === 'vertical') {
          offset = {
            x: prevOffset.x,
            y: prevOffset.y + prevCenter.y - optCenter.y
          };
        } else {
          offset = {
            x: prevOffset.x + prevCenter.x - optCenter.x,
            y: prevOffset.y
          };
        }
      } else {
        offset = { x: prevOffset.x, y: prevOffset.y };
      }
    }

    const tileWidth = p.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
    const tileHeight = p.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;
    const left = minX * CELL_SIZE + offset.x;
    const top = minY * CELL_SIZE + offset.y;

    // 3. Visual boundary check
    if (left < 0 || (left + tileWidth) > (GRID_SIZE * CELL_SIZE) || top < 0 || (top + tileHeight) > (GRID_SIZE * CELL_SIZE)) {
      return; // Rejects placements that would render outside the visual board area
    }

    // 4. Visual collision check with all existing tiles on the board
    if (board && board.length > 0) {
      const pRect = {
        left: left,
        top: top,
        width: tileWidth,
        height: tileHeight
      };

      for (let idx = 0; idx < board.length; idx++) {
        const t = board[idx];
        const tOffset = boardOffsets[idx] || { x: 0, y: 0 };
        const tMinX = Math.min(t.x, t.x2);
        const tMinY = Math.min(t.y, t.y2);
        const tWidth = t.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
        const tHeight = t.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;
        const tRect = {
          left: tMinX * CELL_SIZE + tOffset.x,
          top: tMinY * CELL_SIZE + tOffset.y,
          width: tWidth,
          height: tHeight
        };

        // Strict inequality so touching edges are not counted as overlapping
        const overlaps = (
          pRect.left < tRect.left + tRect.width &&
          pRect.left + pRect.width > tRect.left &&
          pRect.top < tRect.top + tRect.height &&
          pRect.top + pRect.height > tRect.top
        );

        if (overlaps) {
          return; // Rejects placements that visually overlap with any existing tile
        }
      }
    }

    placements.push(p);
  };

  if (endIsDouble) {
    if (endTile.orientation === 'horizontal') {
      // Doble horizontal: nueva ficha es vertical (arriba para left, abajo para right)
      // Usar Math.min(endTile.x, endTile.x2) para que ambas opciones (Arriba y Abajo) estén en la misma columna (alineadas al medio)
      const minX = Math.min(endTile.x, endTile.x2);
      if (side === 'left') {
        // Opción Arriba
        addPlacementCandidate({
          tile: [outerVal, connVal],
          x: minX,
          y: ey - 2,
          x2: minX,
          y2: ey - 1,
          orientation: 'vertical',
          side
        });
      } else {
        // Opción Abajo
        addPlacementCandidate({
          tile: [connVal, outerVal],
          x: minX,
          y: ey + 1,
          x2: minX,
          y2: ey + 2,
          orientation: 'vertical',
          side
        });
      }
    } else {
      // Doble vertical: nueva ficha es horizontal (izquierda para left, derecha para right)
      // Usar Math.min(endTile.y, endTile.y2) para que ambas opciones (Izquierda y Derecha) estén en la misma fila (alineadas al medio)
      const minY = Math.min(endTile.y, endTile.y2);
      if (side === 'left') {
        // Opción Izquierda
        addPlacementCandidate({
          tile: [outerVal, connVal],
          x: ex - 2,
          y: minY,
          x2: ex - 1,
          y2: minY,
          orientation: 'horizontal',
          side
        });
      } else {
        // Opción Derecha
        addPlacementCandidate({
          tile: [connVal, outerVal],
          x: ex + 1,
          y: minY,
          x2: ex + 2,
          y2: minY,
          orientation: 'horizontal',
          side
        });
      }
    }
  } else {
    // El extremo es una ficha NORMAL.
    const tileIsDouble = tile[0] === tile[1];
    if (tileIsDouble) {
      // La nueva ficha es un DOBLE: se coloca perpendicular, centrada en el extremo
      if (endTile.orientation === 'horizontal') {
        // El doble debe ser vertical
        if (side === 'left') {
          addPlacementCandidate({
            tile: [connVal, connVal],
            x: ex - 1,
            y: ey - 1,
            x2: ex - 1,
            y2: ey,
            orientation: 'vertical',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, connVal],
            x: ex + 1,
            y: ey,
            x2: ex + 1,
            y2: ey - 1,
            orientation: 'vertical',
            side
          });
        }
      } else {
        // El doble debe ser horizontal
        if (side === 'left') {
          addPlacementCandidate({
            tile: [connVal, connVal],
            x: ex - 1,
            y: ey - 1,
            x2: ex,
            y2: ey - 1,
            orientation: 'horizontal',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, connVal],
            x: ex - 1,
            y: ey + 1,
            x2: ex,
            y2: ey + 1,
            orientation: 'horizontal',
            side
          });
        }
      }
    } else {
      // La nueva ficha es NORMAL (no es doble). Puede colocarse en 3 direcciones:
      if (endTile.orientation === 'horizontal') {
        // 1. Recto (horizontal)
        if (side === 'left') {
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: ex - 2,
            y: ey,
            x2: ex - 1,
            y2: ey,
            orientation: 'horizontal',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: ex + 1,
            y: ey,
            x2: ex + 2,
            y2: ey,
            orientation: 'horizontal',
            side
          });
        }

        // 2. Giro arriba (vertical)
        if (side === 'left') {
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: ex,
            y: ey - 2,
            x2: ex,
            y2: ey - 1,
            orientation: 'vertical',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: ex,
            y: ey - 1,
            x2: ex,
            y2: ey - 2,
            orientation: 'vertical',
            side
          });
        }

        // 3. Giro abajo (vertical)
        if (side === 'left') {
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: ex,
            y: ey + 2,
            x2: ex,
            y2: ey + 1,
            orientation: 'vertical',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: ex,
            y: ey + 1,
            x2: ex,
            y2: ey + 2,
            orientation: 'vertical',
            side
          });
        }
      } else {
        // El extremo es vertical
        // 1. Recto (vertical)
        if (side === 'left') {
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: ex,
            y: ey - 2,
            x2: ex,
            y2: ey - 1,
            orientation: 'vertical',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: ex,
            y: ey + 1,
            x2: ex,
            y2: ey + 2,
            orientation: 'vertical',
            side
          });
        }

        // 2. Giro izquierda (horizontal)
        if (side === 'left') {
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: ex - 2,
            y: ey,
            x2: ex - 1,
            y2: ey,
            orientation: 'horizontal',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: ex - 1,
            y: ey,
            x2: ex - 2,
            y2: ey,
            orientation: 'horizontal',
            side
          });
        }

        // 3. Giro derecha (horizontal)
        if (side === 'left') {
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: ex + 2,
            y: ey,
            x2: ex + 1,
            y2: ey,
            orientation: 'horizontal',
            side
          });
        } else {
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: ex + 1,
            y: ey,
            x2: ex + 2,
            y2: ey,
            orientation: 'horizontal',
            side
          });
        }
      }
    }
  }

  // Deduplicar posiciones físicas idénticas
  const seen = new Set();
  const uniquePlacements = [];
  for (const p of placements) {
    const minX = Math.min(p.x, p.x2);
    const minY = Math.min(p.y, p.y2);
    const key = `${minX},${minY},${p.orientation}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePlacements.push(p);
    }
  }

  return uniquePlacements;
}



// Centrar ficha normal si pertenece a un segmento acoplado a un doble perpendicular
function getVisualCoords(pos, idx, boardOffsets) {
  const offset = boardOffsets[idx] || { x: 0, y: 0 };
  const left = Math.min(pos.x, pos.x2) * CELL_SIZE + offset.x;
  const top = Math.min(pos.y, pos.y2) * CELL_SIZE + offset.y;
  return { left, top };
}

// Centrar ficha fantasma normal si pertenece a un segmento acoplado a un doble perpendicular
function getGhostVisualCoords(opt, board, boardOffsets) {
  const left = Math.min(opt.x, opt.x2) * CELL_SIZE;
  const top = Math.min(opt.y, opt.y2) * CELL_SIZE;

  if (!board || board.length === 0 || !boardOffsets || boardOffsets.length === 0) {
    return { left, top };
  }

  let offset = { x: 0, y: 0 };
  let prev, prevOffset;
  if (opt.side === 'left') {
    prev = board[0];
    prevOffset = boardOffsets[0] || { x: 0, y: 0 };
  } else {
    prev = board[board.length - 1];
    prevOffset = boardOffsets[board.length - 1] || { x: 0, y: 0 };
  }

  const prevIsDouble = prev.tile[0] === prev.tile[1];
  const optIsDouble = opt.tile[0] === opt.tile[1];

  if (prev.orientation !== opt.orientation && (prevIsDouble || optIsDouble)) {
    const prevCenter = getCenter(prev);
    const optCenter = getCenter(opt);
    const doubleTile = optIsDouble ? opt : prev;
    if (doubleTile.orientation === 'vertical') {
      offset = {
        x: prevOffset.x,
        y: prevOffset.y + prevCenter.y - optCenter.y
      };
    } else {
      offset = {
        x: prevOffset.x + prevCenter.x - optCenter.x,
        y: prevOffset.y
      };
    }
  } else {
    offset = { x: prevOffset.x, y: prevOffset.y };
  }

  return {
    left: left + offset.x,
    top: top + offset.y
  };
}

export default function Board({
  board,
  ends,
  selectedTile = null,
  onPlayTile = null,
  myTurn = false,
  lastAction = null,
  draggedTile = null,
  onSnapChange = null
}) {
  const containerRef = useRef(null);

  const boardOffsets = useMemo(() => {
    return computeBoardOffsets(board);
  }, [board]);

  // Seleccionar la ficha activa para placements (arrastrando o seleccionada)
  const activeTileForPlacements = useMemo(() => {
    if (draggedTile) return draggedTile.tile;
    if (selectedTile) return selectedTile.tile;
    return null;
  }, [draggedTile, selectedTile]);

  // Calcular siluetas fantasmas disponibles
  const ghostPlacements = useMemo(() => {
    if (!myTurn || !activeTileForPlacements) return [];
    
    if (!board || board.length === 0) {
      return getValidPlacementsForTile(board, activeTileForPlacements, 'first');
    }

    const placements = [];
    const leftPlacements = getValidPlacementsForTile(board, activeTileForPlacements, 'left');
    const rightPlacements = getValidPlacementsForTile(board, activeTileForPlacements, 'right');
    
    placements.push(...leftPlacements);
    placements.push(...rightPlacements);
    
    return placements;
  }, [board, activeTileForPlacements, myTurn]);

  // Centrar el tablero inicialmente
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      containerRef.current.scrollLeft = (GRID_SIZE * CELL_SIZE - containerWidth) / 2;
      containerRef.current.scrollTop = (GRID_SIZE * CELL_SIZE - containerHeight) / 2;
    }
  }, []);

  // Autocentrado hacia última pieza jugada
  useEffect(() => {
    if (board && board.length > 0 && containerRef.current) {
      let lastTile = board[board.length - 1];
      if (lastAction && lastAction.type === 'play' && lastAction.tile) {
        const matchingTile = board.find((pos, idx) =>
          (idx === 0 || idx === board.length - 1) &&
          ((pos.tile[0] === lastAction.tile[0] && pos.tile[1] === lastAction.tile[1]) ||
           (pos.tile[0] === lastAction.tile[1] && pos.tile[1] === lastAction.tile[0]))
        );
        if (matchingTile) lastTile = matchingTile;
      }

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const lastTileIdx = board.indexOf(lastTile);
      const { left: tileLeft, top: tileTop } = getVisualCoords(lastTile, lastTileIdx, boardOffsets);

      containerRef.current.scrollTo({
        left: tileLeft - containerWidth / 2 + CELL_SIZE,
        top: tileTop - containerHeight / 2 + CELL_SIZE / 2,
        behavior: 'smooth'
      });
    }
  }, [board, lastAction, boardOffsets]);

  // Calcular y notificar snap en tiempo real
  useEffect(() => {
    if (!draggedTile || ghostPlacements.length === 0 || !onSnapChange) {
      onSnapChange?.(false, null);
      return;
    }

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const localX = (draggedTile.currentX - rect.left) + containerRef.current.scrollLeft;
    const localY = (draggedTile.currentY - rect.top) + containerRef.current.scrollTop;

    let bestPlacement = null;
    let minDistance = Infinity;
    const threshold = 45; // 45 píxeles de umbral para imantación

    for (const opt of ghostPlacements) {
      const { left: tileLeft, top: tileTop } = getGhostVisualCoords(opt, board, boardOffsets);
      const tileWidth = opt.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
      const tileHeight = opt.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;

      const centerX = tileLeft + tileWidth / 2;
      const centerY = tileTop + tileHeight / 2;

      const dist = Math.hypot(localX - centerX, localY - centerY);
      if (dist < minDistance && dist < threshold) {
        minDistance = dist;
        bestPlacement = opt;
      }
    }

    if (bestPlacement) {
      onSnapChange(true, bestPlacement);
    } else {
      onSnapChange(false, null);
    }
  }, [draggedTile, ghostPlacements, onSnapChange, board, boardOffsets]);

  const renderGhostPlacements = () => {
    return ghostPlacements.map((opt, idx) => {
      const isSnappedActive = draggedTile?.isSnapped &&
        draggedTile?.activePlacement &&
        draggedTile.activePlacement.x === opt.x &&
        draggedTile.activePlacement.y === opt.y &&
        draggedTile.activePlacement.orientation === opt.orientation;

      const { left: tileLeft, top: tileTop } = getGhostVisualCoords(opt, board, boardOffsets);
      const tileWidth = opt.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
      const tileHeight = opt.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;

      const magnetLeft = tileWidth / 2 - 12;
      const magnetTop = tileHeight / 2 - 12;

      // Determinar qué tile mostrar de forma predictiva según el arrastre o la selección
      const currentTile = draggedTile ? draggedTile.tile : (selectedTile ? selectedTile.tile : null);

      const displayTile = currentTile
        ? (opt.orientation === 'horizontal'
            ? (opt.x < opt.x2 ? [currentTile[0], currentTile[1]] : [currentTile[1], currentTile[0]])
            : (opt.y < opt.y2 ? [currentTile[0], currentTile[1]] : [currentTile[1], currentTile[0]]))
        : null;

      return (
        <div
          key={`ghost-${idx}`}
          className="absolute z-20 group"
          style={{
            left: `${tileLeft}px`,
            top: `${tileTop}px`,
            width: `${tileWidth}px`,
            height: `${tileHeight}px`,
            pointerEvents: 'none'
          }}
        >
          {/* Silueta punteada translúcida */}
          <div className="absolute inset-0 border-2 border-dashed border-domino-accent/30 bg-domino-accent/5 rounded" />

          {/* Vista previa de la ficha imantada */}
          {isSnappedActive && displayTile && (
            <div className="absolute inset-0 opacity-80 border border-domino-accent/40 rounded shadow-lg overflow-hidden scale-[0.98]">
              <Tile
                tile={displayTile}
                orientation={opt.orientation}
                size="sm"
              />
            </div>
          )}

          {/* Círculo interactivo del Imán (🧲) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onPlayTile && onPlayTile(opt.side, opt);
            }}
            className={`absolute rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg select-none cursor-pointer transition-all duration-150 pointer-events-auto z-30 hover:scale-115 active:scale-90 ${
              isSnappedActive
                ? 'bg-domino-accent text-domino-dark border border-white shadow-amber-500/50 scale-125'
                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-blue-500/50 animate-pulse'
            }`}
            style={{
              left: `${magnetLeft}px`,
              top: `${magnetTop}px`,
              width: '24px',
              height: '24px'
            }}
            title="Imán de conexión"
          >
            🧲
          </div>
        </div>
      );
    });
  };

  if (!board || board.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full max-w-[640px] mx-auto h-full min-h-[300px] sm:min-h-[420px] relative overflow-auto rounded-xl border border-slate-700 shadow-2xl bg-felt-inset"
        style={{
          backgroundImage: 'url("/mesa-de-juego.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div
          className="relative"
          style={{ width: `${GRID_SIZE * CELL_SIZE}px`, height: `${GRID_SIZE * CELL_SIZE}px` }}
        >
          {renderGhostPlacements()}

          <div className="absolute inset-0 flex items-center justify-center text-domino-cream/60 italic text-sm sm:text-base pointer-events-none">
            <div className="text-center p-6 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-700/50 max-w-xs">
              <div className="text-domino-accent/50 text-4xl mb-2 font-serif">🀫</div>
              <div>El tablero está vacío</div>
              <div className="text-xs mt-1 opacity-70">
                {myTurn
                  ? 'Arrastra una ficha válida de tu mano o haz clic en los imanes del centro para iniciar.'
                  : 'Esperando que comience la ronda...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[640px] mx-auto h-full min-h-[300px] sm:min-h-[420px] relative overflow-auto rounded-xl border border-slate-700 shadow-2xl select-none bg-felt-inset"
      style={{
        backgroundImage: 'url("/mesa-de-juego.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div
        className="relative"
        style={{
          width: `${GRID_SIZE * CELL_SIZE}px`,
          height: `${GRID_SIZE * CELL_SIZE}px`
        }}
      >
        {/* Renderizar Fichas Colocadas */}
        {board.map((pos, i) => {
          const tile = pos.tile;
          const isNewest = lastAction && lastAction.type === 'play' &&
            ((lastAction.tile[0] === tile[0] && lastAction.tile[1] === tile[1]) ||
             (lastAction.tile[0] === tile[1] && lastAction.tile[1] === tile[0])) &&
            (i === 0 || i === board.length - 1);

          const displayTile = pos.orientation === 'horizontal'
            ? (pos.x < pos.x2 ? [tile[0], tile[1]] : [tile[1], tile[0]])
            : (pos.y < pos.y2 ? [tile[0], tile[1]] : [tile[1], tile[0]]);

          const { left, top } = getVisualCoords(pos, i, boardOffsets);

          return (
            <div
              key={`tile-${i}`}
              className={`absolute ${isNewest ? 'tile-placed z-10' : ''}`}
              style={{ left: `${left}px`, top: `${top}px` }}
            >
              <Tile
                tile={displayTile}
                orientation={pos.orientation}
                size="sm"
                isNewest={isNewest}
              />
            </div>
          );
        })}

        {/* Renderizar Siluetas e Imanes */}
        {renderGhostPlacements()}
      </div>
    </div>
  );
}