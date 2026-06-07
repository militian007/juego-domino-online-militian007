import { useMemo, useRef, useState, useEffect } from 'react';
import Tile from './Tile.jsx';
import { TILE_W, TILE_H, getShapeById } from './boardShapes.js';

const PADDING = 16;

function getTileDims(orientation) {
  return orientation === 'horizontal'
    ? { w: TILE_W, h: TILE_H }
    : { w: TILE_H, h: TILE_W };
}

function calculateLayout(board, shapeFn) {
  const positions = [];
  let chainEndX = 0;
  let chainEndY = TILE_H / 2;
  let prevDir = -1;
  let isFirstInDirection = true;
  let turnCount = 0;
  const dirPattern = [0, 1, 0, 1];

  for (let i = 0; i < board.length; i++) {
    const tile = board[i].tile;
    const isDouble = tile[0] === tile[1];
    const requestedDir = shapeFn(i);

    let dir = requestedDir;
    let turnAtIndex = false;

    if (prevDir !== -1 && prevDir !== dir) {
      if (prevDir === 0 && dir === 1) {
        chainEndY += TILE_H / 2;
      } else if (prevDir === 1 && dir === 0) {
        chainEndX += TILE_H / 2;
      }
      turnAtIndex = true;
    }

    let px, py, orient;
    if (dir === 0) {
      orient = isDouble ? 'vertical' : 'horizontal';
      px = chainEndX;
      py = isDouble ? chainEndY - TILE_W / 2 : chainEndY - TILE_H / 2;
      chainEndX += isDouble ? TILE_H : TILE_W;
    } else {
      orient = isDouble ? 'horizontal' : 'vertical';
      px = isDouble ? chainEndX - TILE_W / 2 : chainEndX - TILE_H / 2;
      py = chainEndY;
      chainEndY += isDouble ? TILE_W : TILE_H;
    }

    positions.push({ x: px, y: py, orientation: orient });
    prevDir = dir;
  }

  return positions;
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
    () => (board && board.length > 0 ? calculateLayout(board, shape.fn) : []),
    [board, shape]
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
  const scale = Math.min(scaleX, scaleY, 1);

  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;
  const centerX = size.width > 0 ? (size.width - scaledWidth) / 2 : 0;
  const centerY = size.height > 0 ? (size.height - scaledHeight) / 2 : 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[260px] sm:min-h-[380px] relative overflow-hidden"
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
