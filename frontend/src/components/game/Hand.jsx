import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import Tile from './Tile.jsx';

/** El hueco entre fichas, en pixeles. Tiene que coincidir con el gap del CSS. */
const HUECO = 3;

/** Lo mas grande que se deja una ficha, aunque sobre sitio. Mas se ve payaso. */
const MAXIMO = 58;

/** Lo mas chica antes de preferir dos filas: por debajo no se acierta con el dedo. */
const MINIMO = 34;

/**
 * Cuanto mide cada ficha de la mano, medido sobre la pantalla de verdad.
 *
 * Se prueba primero a meterlas todas en una fila. Si para eso hay que hacerlas
 * mas chicas que el minimo, se parten en dos filas y se calcula de nuevo: dos
 * filas de fichas grandes se tocan mejor que una fila de fichas diminutas.
 */
function useAnchoDeFicha(ref, cuantas) {
  const [ancho, setAncho] = useState(0);

  useLayoutEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const medir = () => setAncho(nodo.clientWidth);
    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [ref]);

  if (!ancho || !cuantas) return null;

  // El padding horizontal del contenedor de las fichas (px-1 a cada lado).
  const util = ancho - 8;
  const paraFilas = (filas) => {
    const porFila = Math.ceil(cuantas / filas);
    return Math.floor((util - HUECO * (porFila - 1)) / porFila);
  };

  let medida = paraFilas(1);
  if (medida < MINIMO) medida = paraFilas(2);

  return Math.max(24, Math.min(MAXIMO, medida));
}

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
  // La ficha que se arrastra tambien tiene que salir con la pinta elegida. Se
  // dibuja aparte de `Tile`, con su propia etiqueta de imagen, y por eso se
  // habia quedado con la ruta vieja fija: al arrastrar aparecia la clasica
  // aunque la mano fuera de hueso.

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
        // Sin esto el navegador scrollea la pagina mientras arrastras y la
        // pantalla "salta". El listener ya esta en passive:false para poder
        // cancelarlo; faltaba cancelarlo.
        e.preventDefault();
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

  // Las fichas se estiran hasta llenar el ancho que de verdad hay.
  //
  // Antes eran tres escalones fijos por cantidad de fichas, y dejaban aire sin
  // usar: en un telefono de 375 pixeles, siete fichas ocupaban 287 de los 351
  // disponibles. Los amigos de Jonathan pidieron fichas mas grandes y estaban
  // ahi, sin pedirle nada a nadie.
  const anchoFicha = useAnchoDeFicha(handRef, tiles.length);

  if (!tiles || tiles.length === 0) {
    return (
      <div className="text-center text-slate-400 italic text-sm py-4">
        Sin fichas en mano
      </div>
    );
  }

  return (
    <div ref={handRef} className="w-full overflow-visible py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-[3px] gap-y-2 px-1">
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
            // Si la ficha no se puede jugar no interferimos: el dedo scrollea normal.
            if (!canPlay || !isValid || draggedTile) return;
            // Si si se puede, el gesto es un arrastre y no un scroll.
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            onDragStart?.(i, tile, touch.clientX, touch.clientY);
          };

          return (
            <div
              key={i}
              // Lo lee la mesa para saber DE DONDE sale la ficha al jugarla, y
              // poder hacerla volar desde ahi (§122).
              data-ficha-mano={i}
              className="shrink-0 relative touch-none"
              style={{ opacity: isDragging ? 0 : 1 }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <Tile
                tile={tile}
                orientation="vertical"
                ancho={anchoFicha}
                selected={isSelected}
                dim={canPlay && !isValid}
                onClick={() => !draggedTile && isValid && onSelect && onSelect(i)}
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      {/* La ficha que sigue al dedo mientras la arrastras (§135).
          Solo se muestra si NO esta imantada a un iman: ahi ya se ve en su sitio.

          Usa el MISMO componente que todas las demas fichas del juego. Antes era
          una `<img>` suelta metida a la fuerza en una caja de 48x96 con
          `object-fit: cover`: la imagen de una ficha es HORIZONTAL, asi que
          forzarla en una caja vertical la ampliaba y le recortaba los lados. Se
          veia una tira del medio y no se sabia que ficha llevabas. */}
      {draggedTile && !draggedTile.isSnapped && (
        <div
          style={{
            position: 'fixed',
            left: `${draggedTile.currentX}px`,
            top: `${draggedTile.currentY}px`,
            // Levantada un poco por encima del dedo: debajo la tapa tu propia mano.
            transform: 'translate(-50%, -68%)',
            pointerEvents: 'none',
            zIndex: 9999,
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.55))'
          }}
        >
          <Tile
            tile={draggedTile.tile}
            orientation="vertical"
            ancho={anchoFicha}
            selected
          />
        </div>
      )}
    </div>
  );
}