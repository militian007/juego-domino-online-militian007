import { useMemo, useRef, useState, useEffect } from 'react';
import Tile from './Tile.jsx';
import { TILE_W, TILE_H, getShapeById } from './boardShapes.js';

const PADDING = 16;

function getTileDims(orientation) {
  return orientation === 'horizontal'
    ? { w: TILE_W, h: TILE_H }
    : { w: TILE_H, h: TILE_W };
}

function calculateLayout(board, boardShape) {
  if (!board || board.length === 0) return [];

  const H = TILE_H; // 32
  const W = TILE_W; // 64

  // Centros de cada mitad de una ficha (H0 y H1)
  function getHalfCenter(tilePos, halfIndex, dir) {
    const { x, y, orientation, isDouble } = tilePos;
    if (isDouble) {
      if (orientation === 'horizontal') {
        if (dir === 'down' || dir === 'up') return { x, y };
      } else {
        if (dir === 'right' || dir === 'left') return { x, y };
      }
    }
    if (orientation === 'horizontal') {
      return halfIndex === 0 ? { x: x - H / 2, y } : { x: x + H / 2, y };
    } else {
      return halfIndex === 0 ? { x, y: y - H / 2 } : { x, y: y + H / 2 };
    }
  }

  // Centro de la ficha a partir del centro de una mitad
  function getTileCenterFromHalf(halfCenter, halfIndex, orientation, isDouble, dir) {
    if (isDouble) {
      if (orientation === 'horizontal') {
        if (dir === 'down' || dir === 'up') return { x: halfCenter.x, y: halfCenter.y };
      } else {
        if (dir === 'right' || dir === 'left') return { x: halfCenter.x, y: halfCenter.y };
      }
    }
    if (orientation === 'horizontal') {
      return halfIndex === 0
        ? { x: halfCenter.x + H / 2, y: halfCenter.y }
        : { x: halfCenter.x - H / 2, y: halfCenter.y };
    } else {
      return halfIndex === 0
        ? { x: halfCenter.x, y: halfCenter.y + H / 2 }
        : { x: halfCenter.x, y: halfCenter.y - H / 2 };
    }
  }

  let anchorIndex = board.findIndex((item) => item.side === 'first');
  if (anchorIndex === -1) anchorIndex = 0;

  const positions = new Array(board.length);
  const anchorTile = board[anchorIndex].tile;
  const anchorDouble = anchorTile[0] === anchorTile[1];
  const anchorOrient = anchorDouble ? 'vertical' : 'horizontal';

  positions[anchorIndex] = { x: 0, y: 0, orientation: anchorOrient, isDouble: anchorDouble };

  // Helper para obtener la dirección de avance según el tipo de figura
  function getPlacementDir(shape, chainSide, j) {
    if (shape === 'espiral') {
      if (chainSide === 'right') {
        const segs = [
          { dir: 'right', len: 4 },
          { dir: 'down', len: 3 },
          { dir: 'left', len: 8 },
          { dir: 'up', len: 7 },
          { dir: 'right', len: 12 },
          { dir: 'down', len: 11 }
        ];
        let acc = 0;
        for (const seg of segs) {
          acc += seg.len;
          if (j <= acc) return seg.dir;
        }
        return 'right';
      } else {
        const segs = [
          { dir: 'left', len: 4 },
          { dir: 'up', len: 5 },
          { dir: 'right', len: 8 },
          { dir: 'down', len: 9 },
          { dir: 'left', len: 12 },
          { dir: 'up', len: 13 }
        ];
        let acc = 0;
        for (const seg of segs) {
          acc += seg.len;
          if (j <= acc) return seg.dir;
        }
        return 'left';
      }
    } else if (shape === 'serpiente') {
      if (chainSide === 'right') {
        if (j <= 3) return 'right';
        const cycleIndex = (j - 4) % 20;
        if (cycleIndex < 3) return 'up';
        if (cycleIndex < 10) return 'left';
        if (cycleIndex < 13) return 'up';
        return 'right';
      } else {
        if (j <= 3) return 'left';
        const cycleIndex = (j - 4) % 20;
        if (cycleIndex < 3) return 'down';
        if (cycleIndex < 10) return 'right';
        if (cycleIndex < 13) return 'down';
        return 'left';
      }
    } else if (shape === 'bucle') {
      if (chainSide === 'right') {
        if (j <= 4) return 'right';
        if (j <= 7) return 'down';
        if (j <= 16) return 'left';
        if (j <= 22) return 'up';
        if (j <= 31) return 'right';
        return 'down';
      } else {
        if (j <= 4) return 'left';
        if (j <= 7) return 'up';
        if (j <= 16) return 'right';
        if (j <= 22) return 'down';
        if (j <= 31) return 'left';
        return 'up';
      }
    } else if (shape === 'zigzag') {
      if (chainSide === 'right') {
        if (j <= 4) return 'right';
        if (j <= 6) return 'up';
        return 'left';
      } else {
        if (j <= 4) return 'left';
        if (j <= 6) return 'down';
        return 'right';
      }
    } else if (shape === 'laberinto') {
      if (chainSide === 'right') {
        if (j <= 4) return 'down';
        if (j <= 6) return 'right';
        return 'up';
      } else {
        if (j <= 4) return 'up';
        if (j <= 6) return 'left';
        return 'down';
      }
    }
    return chainSide === 'right' ? 'right' : 'left';
  }

  // Llenar cadena derecha (hacia adelante)
  for (let i = anchorIndex + 1; i < board.length; i++) {
    const tile = board[i].tile;
    const isDouble = tile[0] === tile[1];
    const prevPos = positions[i - 1];
    const j = i - anchorIndex;
    const dir = getPlacementDir(boardShape, 'right', j);

    let orient =
      dir === 'right' || dir === 'left'
        ? isDouble
          ? 'vertical'
          : 'horizontal'
        : isDouble
        ? 'horizontal'
        : 'vertical';

    const A_halfIndex = (dir === 'right' || dir === 'down') ? 1 : 0;
    const B_halfIndex = (dir === 'right' || dir === 'down') ? 0 : 1;

    const A_half = getHalfCenter(prevPos, A_halfIndex, dir);
    let B_half = { x: A_half.x, y: A_half.y };
    if (dir === 'right') B_half.x += H;
    else if (dir === 'left') B_half.x -= H;
    else if (dir === 'down') B_half.y += H;
    else if (dir === 'up') B_half.y -= H;

    const B_pos = getTileCenterFromHalf(B_half, B_halfIndex, orient, isDouble, dir);
    positions[i] = { x: B_pos.x, y: B_pos.y, orientation: orient, isDouble };
  }

  // Llenar cadena izquierda (hacia atrás)
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const tile = board[i].tile;
    const isDouble = tile[0] === tile[1];
    const nextPos = positions[i + 1];
    const j = anchorIndex - i;
    const dir = getPlacementDir(boardShape, 'left', j);

    let orient =
      dir === 'right' || dir === 'left'
        ? isDouble
          ? 'vertical'
          : 'horizontal'
        : isDouble
        ? 'horizontal'
        : 'vertical';

    const A_halfIndex = (dir === 'right' || dir === 'down') ? 1 : 0;
    const B_halfIndex = (dir === 'right' || dir === 'down') ? 0 : 1;

    const A_half = getHalfCenter(nextPos, A_halfIndex, dir);
    let B_half = { x: A_half.x, y: A_half.y };
    if (dir === 'right') B_half.x += H;
    else if (dir === 'left') B_half.x -= H;
    else if (dir === 'down') B_half.y += H;
    else if (dir === 'up') B_half.y -= H;

    const B_pos = getTileCenterFromHalf(B_half, B_halfIndex, orient, isDouble, dir);
    positions[i] = { x: B_pos.x, y: B_pos.y, orientation: orient, isDouble };
  }

  // Convertir centros a esquina superior-izquierda para renderizar en HTML
  return positions.map((pos) => {
    return pos.orientation === 'horizontal'
      ? { x: pos.x - W / 2, y: pos.y - H / 2, orientation: 'horizontal' }
      : { x: pos.x - H / 2, y: pos.y - W / 2, orientation: 'vertical' };
  });
}

export default function Board({ board, ends, boardShape = 'l' }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const prevBoardLenRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const shape = getShapeById(boardShape);

  const positions = useMemo(
    () => (board && board.length > 0 ? calculateLayout(board, boardShape) : []),
    [board, boardShape]
  );

  const lastIndex = (board?.length || 0) - 1;

  useEffect(() => {
    prevBoardLenRef.current = board?.length || 0;
  }, [board?.length]);

  if (!board || board.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[260px] sm:min-h-[380px] flex items-center justify-center text-domino-cream/60 italic text-sm sm:text-base"
      >
        <div className="text-center">
          <div className="text-domino-accent/50 text-4xl mb-2 font-serif">{shape.icon}</div>
          <div>Figura: {shape.name}</div>
          <div className="text-xs mt-1 opacity-60">El tablero está vacío. Toca una ficha para empezar.</div>
        </div>
      </div>
    );
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  positions.forEach((pos) => {
    const { w, h } = getTileDims(pos.orientation);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + w);
    maxY = Math.max(maxY, pos.y + h);
  });

  const naturalWidth = maxX - minX + PADDING * 2;
  const naturalHeight = maxY - minY + PADDING * 2;
  const offsetX = -minX + PADDING;
  const offsetY = -minY + PADDING;

  const scaleX = size.width > 0 ? size.width / naturalWidth : 1;
  const scaleY = size.height > 0 ? size.height / naturalHeight : 1;
  const minAllowedScale = size.width > 500 ? 0.85 : 0.7;
  const scale = Math.max(minAllowedScale, Math.min(scaleX, scaleY, 1));

  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;
  const centerX = size.width > 0 ? (size.width - scaledWidth) / 2 : 0;
  const centerY = size.height > 0 ? (size.height - scaledHeight) / 2 : 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[260px] sm:min-h-[380px] relative overflow-hidden bg-cover bg-center rounded-xl border border-slate-700 shadow-2xl"
      style={{
        backgroundImage: 'url("/mesa-de-juego.webp")'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${centerX}px`,
          top: `${centerY}px`,
          width: `${naturalWidth}px`,
          height: `${naturalHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {positions.map((pos, i) => {
          const tile = board[i].tile;
          const isNewest = i === lastIndex;
          return (
            <div
              key={i}
              className={`absolute ${isNewest ? 'tile-placed' : ''}`}
              style={{
                left: `${pos.x + offsetX}px`,
                top: `${pos.y + offsetY}px`,
                animationDelay: isNewest ? '0ms' : '0ms'
              }}
            >
              <Tile
                tile={tile}
                orientation={pos.orientation}
                size="sm"
                isNewest={isNewest}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
