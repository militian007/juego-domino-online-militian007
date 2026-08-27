import { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
import Tile from './Tile.jsx';
import {
  DEFAULT_LAYOUT,
  placementsFor,
  computeBoardOffsets,
  anchorOffsetFor
} from '@privoytruco/domino-engine';

const GRID_SIZE = DEFAULT_LAYOUT.grid;
const CELL_SIZE = DEFAULT_LAYOUT.cell;

// Una celda de aire en cada lado, para que la cadena nunca quede pegada a la
// baranda. No se le quita area de juego a nadie: la rejilla sigue siendo de
// 20x20, solo se dibuja un poco mas chica dentro del paño.
const MARGEN_CELDAS = 1;
const LADO_LOGICO = GRID_SIZE * CELL_SIZE;
const LADO_CON_MARGEN = LADO_LOGICO + 2 * MARGEN_CELDAS * CELL_SIZE;

const getValidPlacementsForTile = (board, tile, side) => placementsFor(board, tile, side);

function getVisualCoords(pos, idx, boardOffsets) {
  const offset = boardOffsets[idx] || { x: 0, y: 0 };
  return {
    left: Math.min(pos.x, pos.x2) * CELL_SIZE + offset.x,
    top: Math.min(pos.y, pos.y2) * CELL_SIZE + offset.y
  };
}

function getGhostVisualCoords(opt, board) {
  const offset = anchorOffsetFor(board, opt);
  return {
    left: Math.min(opt.x, opt.x2) * CELL_SIZE + offset.x,
    top: Math.min(opt.y, opt.y2) * CELL_SIZE + offset.y
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
  onSnapChange = null,
  clasePano = 'felt-verde',
  claseBaranda = 'rail-cognac'
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
  // El tablero de 20x20 se escala para entrar entero en el paño. Antes se
  // scrolleaba, lo que en el telefono era impracticable.
  const tableroVacio = !board || board.length === 0;
  const [escala, setEscala] = useState(1);

  const medirEscala = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const ancho = el.clientWidth;
    if (ancho > 0) {
      // React descarta el estado si el valor no cambia, asi que llamar de mas
      // no provoca renders extra.
      setEscala(ancho / LADO_CON_MARGEN);
    }
  }, []);

  // Se mide por tres vias porque ninguna alcanza sola: en el primer render el
  // ResizeObserver todavia no disparo, y hay entornos donde no dispara nunca.
  useLayoutEffect(medirEscala);

  const desplazamiento = MARGEN_CELDAS * CELL_SIZE * escala;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    medirEscala();
    window.addEventListener('resize', medirEscala);
    window.addEventListener('orientationchange', medirEscala);

    let observador = null;
    if (typeof ResizeObserver !== 'undefined') {
      observador = new ResizeObserver(medirEscala);
      observador.observe(el);
    }

    return () => {
      window.removeEventListener('resize', medirEscala);
      window.removeEventListener('orientationchange', medirEscala);
      observador?.disconnect();
    };
  }, [tableroVacio, medirEscala]);




  // Calcular y notificar snap en tiempo real
  useEffect(() => {
    if (!draggedTile || ghostPlacements.length === 0 || !onSnapChange) {
      onSnapChange?.(false, null);
      return;
    }

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const localX = (draggedTile.currentX - rect.left - desplazamiento) / escala;
    const localY = (draggedTile.currentY - rect.top - desplazamiento) / escala;

    let bestPlacement = null;
    let minDistance = Infinity;
    const threshold = 45 / escala; // 45 px de pantalla, sea cual sea la escala

    for (const opt of ghostPlacements) {
      const { left: tileLeft, top: tileTop } = getGhostVisualCoords(opt, board);
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
  }, [draggedTile, ghostPlacements, onSnapChange, board, boardOffsets, escala, desplazamiento]);

  const renderGhostPlacements = () => {
    return ghostPlacements.map((opt, idx) => {
      const isSnappedActive = draggedTile?.isSnapped &&
        draggedTile?.activePlacement &&
        draggedTile.activePlacement.x === opt.x &&
        draggedTile.activePlacement.y === opt.y &&
        draggedTile.activePlacement.orientation === opt.orientation;

      const { left: tileLeft, top: tileTop } = getGhostVisualCoords(opt, board);
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
      <div className={`rail-base ${claseBaranda} w-full max-w-[768px] mx-auto rounded-[22px] p-[4.2%] relative`}>
      <span className="rail-side rail-top" aria-hidden="true" />
      <span className="rail-side rail-bottom" aria-hidden="true" />
      <span className="rail-side rail-left" aria-hidden="true" />
      <span className="rail-side rail-right" aria-hidden="true" />
      <div
        ref={containerRef}
        className={`felt-base ${clasePano} w-full aspect-square relative overflow-hidden rounded-xl`}
      >
        <div
          className="relative origin-top-left"
          style={{
            width: `${GRID_SIZE * CELL_SIZE}px`,
            height: `${GRID_SIZE * CELL_SIZE}px`,
            transform: `translate(${desplazamiento}px, ${desplazamiento}px) scale(${escala})`
          }}
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
      </div>
    );
  }

  return (
    <div className={`rail-base ${claseBaranda} w-full max-w-[768px] mx-auto rounded-[22px] p-[4.2%] relative`}>
      <span className="rail-side rail-top" aria-hidden="true" />
      <span className="rail-side rail-bottom" aria-hidden="true" />
      <span className="rail-side rail-left" aria-hidden="true" />
      <span className="rail-side rail-right" aria-hidden="true" />
    <div
      ref={containerRef}
      className={`felt-base ${clasePano} w-full aspect-square relative overflow-hidden rounded-xl select-none`}
    >
      <div
        className="relative origin-top-left"
        style={{
          width: `${GRID_SIZE * CELL_SIZE}px`,
          height: `${GRID_SIZE * CELL_SIZE}px`,
          transform: `translate(${desplazamiento}px, ${desplazamiento}px) scale(${escala})`
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
    </div>
  );
}