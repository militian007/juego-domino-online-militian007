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

// Aire en cada lado para que la cadena no quede pegada a la baranda. No se le
// quita area de juego a nadie: la rejilla sigue siendo de 20x20, solo se dibuja
// un poco mas chica dentro del paño.
//
// Con 1 celda en un telefono quedaban solo 15px de aire, y medido, la cadena
// llega a la fila o columna extrema en el 51% de las jugadas: se veia pegada.
// Con 2 celdas quedan 30px en telefono y 55px en escritorio.
const MARGEN_CELDAS = 2;

// La mesa y las fichas tienen UN SOLO tamaño durante toda la mano. Se probo
// acercar la vista a donde esta la cadena, para que las fichas se vieran mas
// grandes al principio, pero el zoom cambiando en cada jugada molesta mas de lo
// que suma. Se dibuja la rejilla entera, siempre igual.
const LADO_CELDAS = GRID_SIZE + 2 * MARGEN_CELDAS;

// Las fichas de la mesa se agrandan mostrando menos paño, no agrandando la
// rejilla: la rejilla define donde caben las fichas y tocarla cambiaria las
// reglas del juego.
//
// Se ven `LADO_CELDAS / zoom` celdas. Con la vista clavada en el centro de la
// rejilla el tope era 1.1: a 1.32 se cortaba una punta jugable en el 5,2% de
// las manos. Con la camara siguiendo la cadena (abajo) ese mismo 1.32 baja a
// 0,53%, medido sobre 144.312 posiciones. Ver contexto/README.md seccion 71.
const ZOOM_FICHAS = 1.32;

// Cuanto puede correrse la camara, en celdas, respecto del centro de la rejilla.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

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
  // El rectangulo donde viven las fichas. Los asientos se sientan en los
  // bordes de la mesa y la cadena no entra ahi: por eso hace falta un margen
  // por cada lado y no solo abajo.
  margenes = { arriba: 0, derecha: 0, abajo: 0, izquierda: 0 },
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
  const [pano, setPano] = useState({ ancho: 0, alto: 0 });

  const medirEscala = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const ancho = el.clientWidth;
    const alto = el.clientHeight;
    if (ancho > 0 && alto > 0) {
      setPano((p) => (p.ancho === ancho && p.alto === alto ? p : { ancho, alto }));
    }
  }, []);

  // Se mide por varias vias porque ninguna alcanza sola: en el primer render el
  // ResizeObserver todavia no disparo, hay entornos donde no dispara nunca, y
  // medir en el mismo render daba el alto a medio asentar (se quedaba en 313
  // cuando el paño terminaba midiendo 792).
  useLayoutEffect(medirEscala);
  useEffect(() => {
    const id = requestAnimationFrame(medirEscala);
    return () => cancelAnimationFrame(id);
  });

  // El rectangulo de juego: el paño menos lo que ocupan los asientos.
  const anchoUtil = Math.max(pano.ancho - margenes.izquierda - margenes.derecha, 120);
  const altoUtil = Math.max(pano.alto - margenes.arriba - margenes.abajo, 120);

  // La cadena es ANCHA, no cuadrada: 11,0 x 6,9 celdas de media y 18,5 x 16 en
  // el percentil 99, medido sobre 116.120 posiciones. Por eso el rectangulo de
  // juego no tiene que ser cuadrado, y manda el eje que quede mas justo.
  const escala =
    anchoUtil > 0 && altoUtil > 0
      ? (Math.min(anchoUtil, altoUtil) / (LADO_CELDAS * CELL_SIZE)) * ZOOM_FICHAS
      : 1;

  const celdasVisiblesX = anchoUtil > 0 ? anchoUtil / (CELL_SIZE * escala) : LADO_CELDAS;
  const celdasVisiblesY = altoUtil > 0 ? altoUtil / (CELL_SIZE * escala) : LADO_CELDAS;

  // La caja que ocupa la cadena dibujada, en celdas. Lleva el corrimiento de
  // los dobles, que es lo que hace que el dibujo se salga de la rejilla.
  const cajaCadena = useMemo(() => {
    if (!board || board.length === 0) return null;
    let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
    board.forEach((pos, i) => {
      const o = boardOffsets[i] ?? { x: 0, y: 0 };
      const ancho = pos.orientation === 'horizontal' ? 2 : 1;
      const alto = pos.orientation === 'horizontal' ? 1 : 2;
      const l = Math.min(pos.x, pos.x2) + o.x / CELL_SIZE;
      const t = Math.min(pos.y, pos.y2) + o.y / CELL_SIZE;
      x1 = Math.min(x1, l); x2 = Math.max(x2, l + ancho);
      y1 = Math.min(y1, t); y2 = Math.max(y2, t + alto);
    });
    // Las dos puntas jugables: si algo tiene que quedar a la vista, son estas.
    const punta = (i) => {
      const pos = board[i];
      const o = boardOffsets[i] ?? { x: 0, y: 0 };
      const ancho = pos.orientation === 'horizontal' ? 2 : 1;
      const alto = pos.orientation === 'horizontal' ? 1 : 2;
      const l = Math.min(pos.x, pos.x2) + o.x / CELL_SIZE;
      const t = Math.min(pos.y, pos.y2) + o.y / CELL_SIZE;
      return { x1: l, x2: l + ancho, y1: t, y2: t + alto, cx: l + ancho / 2, cy: t + alto / 2 };
    };
    const a = punta(0), b = punta(board.length - 1);
    return {
      x1, x2, y1, y2,
      // Caja que contiene solo las dos puntas jugables.
      px1: Math.min(a.x1, b.x1), px2: Math.max(a.x2, b.x2),
      py1: Math.min(a.y1, b.y1), py2: Math.max(a.y2, b.y2),
      puntasX: (a.cx + b.cx) / 2, puntasY: (a.cy + b.cy) / 2
    };
  }, [board, boardOffsets]);

  // La camara se queda QUIETA en el centro de la rejilla mientras la cadena
  // entre en pantalla, que es casi siempre (la cadena mide 11,4 celdas de
  // promedio contra una ventana de 18,2). Solo cuando crece de mas se corre lo
  // justo para no cortar nada, y si ni asi entra, se centra entre las dos
  // puntas jugables. La escala nunca cambia: las fichas no cambian de tamaño.
  // Orden de prioridad: que entre la cadena entera; si no cabe, que entren al
  // menos las dos puntas jugables (es donde se puede jugar); y si ni eso, se
  // centra entre ellas. Medido sobre 142.469 posiciones a este zoom: la camara
  // se queda quieta el 91,4% de las jugadas, una punta se sale el 0,22% y el
  // corrimiento entre jugada y jugada es de 0,41 celdas en el percentil 99.
  const centrar = (visibles, min, max, pMin, pMax, medioPuntas) => {
    const centro = GRID_SIZE / 2;
    if (!cajaCadena) return centro;
    const mitad = visibles / 2;
    if (max - min <= visibles) return clamp(centro, max - mitad, min + mitad);
    if (pMax - pMin <= visibles) return clamp(centro, pMax - mitad, pMin + mitad);
    return medioPuntas;
  };

  const centroX = centrar(celdasVisiblesX, cajaCadena?.x1, cajaCadena?.x2,
    cajaCadena?.px1, cajaCadena?.px2, cajaCadena?.puntasX);
  const centroY = centrar(celdasVisiblesY, cajaCadena?.y1, cajaCadena?.y2,
    cajaCadena?.py1, cajaCadena?.py2, cajaCadena?.puntasY);
  const origenX = centroX - celdasVisiblesX / 2;
  const origenY = centroY - celdasVisiblesY / 2;
  const desplazamientoX = margenes.izquierda - origenX * CELL_SIZE * escala;
  const desplazamientoY = margenes.arriba - origenY * CELL_SIZE * escala;

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
    const localX = (draggedTile.currentX - rect.left - desplazamientoX) / escala;
    const localY = (draggedTile.currentY - rect.top - desplazamientoY) / escala;

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
  }, [draggedTile, ghostPlacements, onSnapChange, board, boardOffsets, escala, desplazamientoX, desplazamientoY]);

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
                size="mesa"
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
      <div className={`rail-base ${claseBaranda} flex h-full w-full flex-col rounded-none relative`}>
      <span className="rail-side rail-top" aria-hidden="true" />
      <span className="rail-side rail-bottom" aria-hidden="true" />
      <span className="rail-side rail-left" aria-hidden="true" />
      <span className="rail-side rail-right" aria-hidden="true" />
      <div
        ref={containerRef}
        className={`felt-base ${clasePano} w-full h-full relative overflow-hidden rounded-xl`}
      >
        <div
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            background:
              'radial-gradient(115% 85% at 50% 4%, rgba(255,246,220,0.14) 0%, rgba(255,246,220,0.04) 34%, rgba(0,0,0,0) 58%),' +
              'radial-gradient(135% 105% at 50% 52%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.40) 100%)'
          }}
        />
        <div
          className="relative origin-top-left"
          style={{
            width: `${GRID_SIZE * CELL_SIZE}px`,
            height: `${GRID_SIZE * CELL_SIZE}px`,
            transform: `translate(${desplazamientoX}px, ${desplazamientoY}px) scale(${escala})`
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
    <div className={`rail-base ${claseBaranda} flex h-full w-full flex-col rounded-none relative`}>
      <span className="rail-side rail-top" aria-hidden="true" />
      <span className="rail-side rail-bottom" aria-hidden="true" />
      <span className="rail-side rail-left" aria-hidden="true" />
      <span className="rail-side rail-right" aria-hidden="true" />
    <div
      ref={containerRef}
      className={`felt-base ${clasePano} w-full h-full relative overflow-hidden rounded-xl select-none`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background:
            'radial-gradient(115% 85% at 50% 4%, rgba(255,246,220,0.14) 0%, rgba(255,246,220,0.04) 34%, rgba(0,0,0,0) 58%),' +
            'radial-gradient(135% 105% at 50% 52%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.40) 100%)'
        }}
      />
      <div
        className="relative origin-top-left"
        style={{
          width: `${GRID_SIZE * CELL_SIZE}px`,
          height: `${GRID_SIZE * CELL_SIZE}px`,
          transform: `translate(${desplazamientoX}px, ${desplazamientoY}px) scale(${escala})`
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
                size="mesa"
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