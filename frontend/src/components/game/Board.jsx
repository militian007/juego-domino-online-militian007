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
  lastAction = null
}) {
  const containerRef = useRef(null);

  // Calcular fantasmas disponibles para la ficha seleccionada
  const ghostPlacements = useMemo(() => {
    if (!myTurn || !selectedTile || !selectedTile.tile) return [];
    
    // Si el tablero está vacío, se juega en el extremo 'first'
    if (!board || board.length === 0) {
      return getValidPlacementsForTile(board, selectedTile.tile, 'first');
    }

    // Si no está vacío, ver qué extremos encajan
    const placements = [];
    const leftPlacements = getValidPlacementsForTile(board, selectedTile.tile, 'left');
    const rightPlacements = getValidPlacementsForTile(board, selectedTile.tile, 'right');
    
    placements.push(...leftPlacements);
    placements.push(...rightPlacements);
    
    return placements;
  }, [board, selectedTile, myTurn]);

  // Centrar el tablero inicialmente en el primer renderizado
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      containerRef.current.scrollLeft = (GRID_SIZE * CELL_SIZE - containerWidth) / 2;
      containerRef.current.scrollTop = (GRID_SIZE * CELL_SIZE - containerHeight) / 2;
    }
  }, []);

  // Autocentrado inteligente hacia la última pieza jugada
  useEffect(() => {
    if (board && board.length > 0 && containerRef.current) {
      // Encontrar la ficha más nueva
      let lastTile = board[board.length - 1]; // por defecto al final
      
      if (lastAction && lastAction.type === 'play' && lastAction.tile) {
        const matchingTile = board.find((pos, idx) => 
          (idx === 0 || idx === board.length - 1) &&
          ((pos.tile[0] === lastAction.tile[0] && pos.tile[1] === lastAction.tile[1]) ||
           (pos.tile[0] === lastAction.tile[1] && pos.tile[1] === lastAction.tile[0]))
        );
        if (matchingTile) {
          lastTile = matchingTile;
        }
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

  if (!board || board.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[300px] sm:min-h-[420px] relative overflow-auto rounded-xl border border-slate-700 shadow-2xl"
        style={{
          backgroundImage: 'url("/mesa-de-juego.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Renderizar área del grid transparente encima */}
        <div 
          className="relative"
          style={{
            width: `${GRID_SIZE * CELL_SIZE}px`,
            height: `${GRID_SIZE * CELL_SIZE}px`,
          }}
        >
          {/* Si es mi turno y tengo una ficha seleccionada, mostrar los fantasmas en el centro */}
          {ghostPlacements.map((opt, idx) => {
            const outerX = (opt.side === 'right') ? opt.x2 : opt.x;
            const outerY = (opt.side === 'right') ? opt.y2 : opt.y;
            const tileLeft = Math.min(opt.x, opt.x2) * CELL_SIZE;
            const tileTop = Math.min(opt.y, opt.y2) * CELL_SIZE;
            const tileWidth = opt.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
            const tileHeight = opt.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;

            return (
              <div
                key={`ghost-${idx}`}
                className="absolute group z-20"
                style={{
                  left: `${tileLeft}px`,
                  top: `${tileTop}px`,
                  width: `${tileWidth}px`,
                  height: `${tileHeight}px`,
                  pointerEvents: 'none'
                }}
              >
                {/* Contorno punteado completo */}
                <div className="absolute inset-0 border-2 border-dashed border-domino-accent/40 bg-domino-accent/5 rounded group-hover:border-domino-accent/80 group-hover:bg-domino-accent/15 transition-all duration-200 shadow-[0_0_8px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]" />
                
                {/* Botón "+" en la celda exterior */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTile && onPlayTile(opt.side, opt);
                  }}
                  className="absolute border border-domino-accent bg-domino-dark/95 text-domino-accent cursor-pointer hover:bg-domino-accent hover:text-domino-dark rounded flex items-center justify-center shadow-[0_0_6px_rgba(212,175,55,0.3)] hover:scale-110 active:scale-95 transition-all duration-150 pointer-events-auto"
                  style={{
                    left: `${(outerX - Math.min(opt.x, opt.x2)) * CELL_SIZE + 4}px`,
                    top: `${(outerY - Math.min(opt.y, opt.y2)) * CELL_SIZE + 4}px`,
                    width: `${CELL_SIZE - 8}px`,
                    height: `${CELL_SIZE - 8}px`
                  }}
                >
                  <span className="font-bold text-sm select-none">+</span>
                </div>
              </div>
            );
          })}

          <div className="absolute inset-0 flex items-center justify-center text-domino-cream/60 italic text-sm sm:text-base pointer-events-none">
            <div className="text-center p-6 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-700/50 max-w-xs">
              <div className="text-domino-accent/50 text-4xl mb-2 font-serif">🀫</div>
              <div>El tablero está vacío</div>
              <div className="text-xs mt-1 opacity-70">
                {myTurn 
                  ? 'Selecciona una ficha de tu mano y haz clic en el centro para iniciar la partida.' 
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
      className="w-full h-full min-h-[300px] sm:min-h-[420px] relative overflow-auto rounded-xl border border-slate-700 shadow-2xl select-none"
      style={{
        backgroundImage: 'url("/mesa-de-juego.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Contenedor del Grid */}
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
          
          // Detectar si es la ficha más nueva
          const isNewest = lastAction && lastAction.type === 'play' && 
            ((lastAction.tile[0] === tile[0] && lastAction.tile[1] === tile[1]) ||
             (lastAction.tile[0] === tile[1] && lastAction.tile[1] === tile[0])) &&
            (i === 0 || i === board.length - 1);

          // Normalizar el orden de las mitades para pasarlo a Tile.jsx:
          // Tile.jsx requiere [min, max] y rota 0/180/90/270.
          // Si es horizontal: el valor en el menor X debe estar en el índice 0.
          // Si es vertical: el valor en el menor Y debe estar en el índice 0.
          const displayTile = pos.orientation === 'horizontal'
            ? (pos.x < pos.x2 ? [tile[0], tile[1]] : [tile[1], tile[0]])
            : (pos.y < pos.y2 ? [tile[0], tile[1]] : [tile[1], tile[0]]);

          const left = Math.min(pos.x, pos.x2) * CELL_SIZE;
          const top = Math.min(pos.y, pos.y2) * CELL_SIZE;

          return (
            <div
              key={`tile-${i}`}
              className={`absolute ${isNewest ? 'tile-placed z-10' : ''}`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
              }}
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

        {/* Renderizar Siluetas Fantasmas (Ghost Placements) */}
        {ghostPlacements.map((opt, idx) => {
          const outerX = (opt.side === 'right') ? opt.x2 : opt.x;
          const outerY = (opt.side === 'right') ? opt.y2 : opt.y;
          const tileLeft = Math.min(opt.x, opt.x2) * CELL_SIZE;
          const tileTop = Math.min(opt.y, opt.y2) * CELL_SIZE;
          const tileWidth = opt.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
          const tileHeight = opt.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;

          return (
            <div
              key={`ghost-${idx}`}
              className="absolute group z-20"
              style={{
                left: `${tileLeft}px`,
                top: `${tileTop}px`,
                width: `${tileWidth}px`,
                height: `${tileHeight}px`,
                pointerEvents: 'none'
              }}
            >
              {/* Contorno punteado completo */}
              <div className="absolute inset-0 border-2 border-dashed border-domino-accent/40 bg-domino-accent/5 rounded group-hover:border-domino-accent/80 group-hover:bg-domino-accent/15 transition-all duration-200 shadow-[0_0_8px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_12px_rgba(212,175,55,0.3)] animate-pulse" />
              
              {/* Botón "+" en la celda exterior */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTile && onPlayTile(opt.side, opt);
                }}
                className="absolute border border-domino-accent bg-domino-dark/95 text-domino-accent cursor-pointer hover:bg-domino-accent hover:text-domino-dark rounded flex items-center justify-center shadow-[0_0_6px_rgba(212,175,55,0.3)] hover:scale-110 active:scale-95 transition-all duration-150 pointer-events-auto"
                style={{
                  left: `${(outerX - Math.min(opt.x, opt.x2)) * CELL_SIZE + 4}px`,
                  top: `${(outerY - Math.min(opt.y, opt.y2)) * CELL_SIZE + 4}px`,
                  width: `${CELL_SIZE - 8}px`,
                  height: `${CELL_SIZE - 8}px`
                }}
              >
                <span className="font-bold text-sm select-none">+</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
