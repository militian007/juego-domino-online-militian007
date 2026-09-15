import { useLayoutEffect, useRef, useState } from 'react';
import Tile from './Tile.jsx';

/**
 * LA FICHA QUE LEVANTAS DEL POZO (seccion 184)
 *
 * Raul: "falta acomodar el efecto cuando eliges el domino volteado y llega a
 * tus manos". Antes la ficha aparecia en la mano de golpe. Ahora la copia
 * boca abajo vuela desde donde la tocaste hasta su sitio en la mano y ahi se
 * voltea, con la misma mecanica del reparto (seccion 182): la ficha de verdad
 * esta escondida en su sitio mientras la copia llega, asi que al terminar no
 * se mueve nada.
 */
const MS_VUELO = 420;

export default function FichaRobada({ tile, desde, onFin }) {
  const [carta, setCarta] = useState(null);
  const listo = useRef(false);

  useLayoutEffect(() => {
    let vivo = true;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!vivo) return;
      const nodo = document.querySelector(`[data-ficha-id="${tile[0]}-${tile[1]}"]`);
      const r = nodo ? nodo.getBoundingClientRect() : null;
      if (!r || !desde) { onFin?.(); return; }
      setCarta({
        x: r.left, y: r.top, w: r.width, h: r.height,
        dx: (desde.left + desde.width / 2) - (r.left + r.width / 2),
        dy: (desde.top + desde.height / 2) - (r.top + r.height / 2)
      });
    }));
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [tile, desde, onFin]);

  const terminar = () => {
    if (listo.current) return;
    listo.current = true;
    onFin?.();
  };

  if (!carta) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
      onAnimationEnd={(e) => { if (e.target.classList.contains('ficha-en-reparto')) setTimeout(terminar, 300); }}
    >
      <div
        className="ficha-en-reparto ficha-reparte-mia absolute"
        style={{
          left: `${carta.x}px`,
          top: `${carta.y}px`,
          width: `${carta.w}px`,
          height: `${carta.h}px`,
          '--dx': `${carta.dx}px`,
          '--dy': `${carta.dy}px`,
          '--retraso': '0ms',
          '--vuelo': `${MS_VUELO}ms`
        }}
      >
        <div className="pool-tile ficha-reparte-dorso absolute inset-0 rounded-[3px]" />
        <div className="ficha-reparte-cara absolute inset-0">
          <Tile tile={tile} orientation="vertical" ancho={carta.w} draggable={false} />
        </div>
      </div>
    </div>
  );
}
