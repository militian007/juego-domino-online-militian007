import { useEffect, useRef, useMemo } from 'react';
import Tile from './Tile.jsx';

const GRID_SIZE = 20;
const CELL_SIZE = 32;

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

  if (side === 'left') {
    const firstTile = board[0];
    ex = firstTile.x;
    ey = firstTile.y;
    ev = firstTile.tile[0];
  } else if (side === 'right') {
    const lastTile = board[board.length - 1];
    ex = lastTile.x2;
    ey = lastTile.y2;
    ev = lastTile.tile[1];
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

  const adjacentDirs = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 }
  ];

  for (const dir1 of adjacentDirs) {
    const cx = ex + dir1.dx;
    const cy = ey + dir1.dy;

    if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) continue;
    if (occupied.has(`${cx},${cy}`)) continue;

    for (const dir2 of adjacentDirs) {
      const cx2 = cx + dir2.dx;
      const cy2 = cy + dir2.dy;

      if (cx2 === ex && cy2 === ey) continue;
      if (cx2 < 0 || cx2 >= GRID_SIZE || cy2 < 0 || cy2 >= GRID_SIZE) continue;
      if (occupied.has(`${cx2},${cy2}`)) continue;

      if (side === 'left') {
        placements.push({
          tile: [outerVal, connVal],
          x: cx2,
          y: cy2,
          x2: cx,
          y2: cy,
          orientation: (cy === cy2) ? 'horizontal' : 'vertical',
          side
        });
      } else {
        placements.push({
          tile: [connVal, outerVal],
          x: cx,
          y: cy,
          x2: cx2,
          y2: cy2,
          orientation: (cy === cy2) ? 'horizontal' : 'vertical',
          side
        });
      }
    }
  }

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
      const tileLeft = Math.min(lastTile.x, lastTile.x2) * CELL_SIZE;
      const tileTop = Math.min(lastTile.y, lastTile.y2) * CELL_SIZE;

      containerRef.current.scrollTo({
        left: tileLeft - containerWidth / 2 + CELL_SIZE,
        top: tileTop - containerHeight / 2 + CELL_SIZE / 2,
        behavior: 'smooth'
      });
    }
  }, [board, lastAction]);

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
      const tileLeft = Math.min(opt.x, opt.x2) * CELL_SIZE;
      const tileTop = Math.min(opt.y, opt.y2) * CELL_SIZE;
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
  }, [draggedTile, ghostPlacements, onSnapChange]);

  const renderGhostPlacements = () => {
    return ghostPlacements.map((opt, idx) => {
      const isSnappedActive = draggedTile?.isSnapped &&
        draggedTile?.activePlacement &&
        draggedTile.activePlacement.x === opt.x &&
        draggedTile.activePlacement.y === opt.y &&
        draggedTile.activePlacement.orientation === opt.orientation;

      const tileLeft = Math.min(opt.x, opt.x2) * CELL_SIZE;
      const tileTop = Math.min(opt.y, opt.y2) * CELL_SIZE;
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
          height: `${GRID_SIZE * CELL_SIZE}px`,
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
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

          const left = Math.min(pos.x, pos.x2) * CELL_SIZE;
          const top = Math.min(pos.y, pos.y2) * CELL_SIZE;

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