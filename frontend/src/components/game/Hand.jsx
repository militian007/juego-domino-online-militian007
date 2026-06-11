import { useRef, useState, useEffect } from 'react';
import Tile from './Tile.jsx';

export default function Hand({
  tiles,
  validIndices = [],
  selectedIndex,
  onSelect,
  canPlay,
  draggedTile = null,
  onDragStart,
  onDragUpdate,
  onDragEnd
}) {
  const handRef = useRef(null);

  // Cleanup & window event handlers for active dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggedTile) {
        onDragUpdate?.(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = (e) => {
      if (draggedTile) {
        onDragEnd?.();
      }
    };

    const handleTouchMove = (e) => {
      if (draggedTile && e.touches.length > 0) {
        const touch = e.touches[0];
        onDragUpdate?.(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      if (draggedTile) {
        onDragEnd?.();
      }
    };

    if (draggedTile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggedTile, onDragUpdate, onDragEnd]);

  if (!tiles || tiles.length === 0) {
    return (
      <div className="text-center text-slate-400 italic text-sm py-4">
        Sin fichas en mano
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto overflow-y-visible py-3">
      <div className="flex items-center justify-center gap-2 px-2 mx-auto" style={{ minWidth: 'fit-content' }}>
        {tiles.map((tile, i) => {
          const isValid = validIndices.includes(i);
          const isSelected = selectedIndex === i;
          const isDragging = draggedTile?.index === i;

          const handleMouseDown = (e) => {
            if (!canPlay || !isValid || draggedTile) return;
            e.preventDefault();
            e.stopPropagation();
            onDragStart?.(i, tile, e.clientX, e.clientY);
          };

          const handleTouchStart = (e) => {
            if (!canPlay || !isValid || draggedTile) return;
            // No prevenimos por defecto para permitir scroll si no se arrastra una ficha válida,
            // pero si es válida evitamos comportamientos raros
            e.stopPropagation();
            const touch = e.touches[0];
            onDragStart?.(i, tile, touch.clientX, touch.clientY);
          };

          return (
            <div
              key={i}
              className="shrink-0 relative touch-none"
              style={{ opacity: isDragging ? 0 : 1 }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <Tile
                tile={tile}
                orientation="vertical"
                size="md"
                selected={isSelected}
                dim={canPlay && !isValid}
                onClick={() => !draggedTile && isValid && onSelect && onSelect(i)}
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      {/* Vista previa de arrastre flotante: solo se muestra si NO está imantada a un imán */}
      {draggedTile && !draggedTile.isSnapped && (
        <img
          src={`/tiles/tile_${Math.min(draggedTile.tile[0], draggedTile.tile[1])}_${Math.max(draggedTile.tile[0], draggedTile.tile[1])}.png`}
          alt=""
          style={{
            position: 'fixed',
            left: `${draggedTile.currentX}px`,
            top: `${draggedTile.currentY}px`,
            width: '48px',
            height: '96px',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5)) brightness(1.1)',
            borderRadius: '6px',
            border: '2px solid #d4af37',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            objectFit: 'cover',
            transition: 'none'
          }}
        />
      )}
    </div>
  );
}