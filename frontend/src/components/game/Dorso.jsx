import { useState } from 'react';
import { useCarpetaDeFichas, rutaDelDorso } from './MesaTheme.jsx';

/**
 * EL DORSO DE LA FICHA (seccion 185)
 *
 * Raul, viendo el reparto: "la ficha por detras se ve horrible; hay que
 * ponerla mas grande y con la misma forma de la ficha por delante". El dorso
 * de la 183 era un rectangulo pintado con CSS: plano, con un marco por dentro
 * que lo hacia parecer un naipe, y de otra forma que la cara.
 *
 * Ahora el dorso ES la ficha: la misma caja que `Tile` (mismo canto, mismo
 * brillo, mismas esquinas) con el dibujo de la 0-0 de la pinta elegida sin la
 * raya del medio (`public/dorsos/<pinta>.webp`). Cambias de pinta y el dorso
 * cambia con ella. Lo usan el pozo, los abanicos de los rivales, el reparto y
 * la ficha que levantas del pozo.
 */
export default function Dorso({ ancho, orientation = 'vertical', className = '', style }) {
  const carpeta = useCarpetaDeFichas();
  const [formato, setFormato] = useState('webp');

  // Misma proporcion que `Tile`: uno a dos.
  const caja = orientation === 'horizontal'
    ? { width: `${ancho}px`, height: `${Math.round(ancho / 2)}px` }
    : { width: `${ancho}px`, height: `${ancho * 2}px` };

  const imagen = orientation === 'horizontal'
    ? { width: '100%', height: '100%', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }
    : { width: '200%', height: '50%', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', pointerEvents: 'none' };

  return (
    <div className={`tile-3d relative select-none overflow-visible rounded ${className}`} style={{ ...caja, ...style }} aria-hidden="true">
      <span className="tile-edge" />
      <img src={rutaDelDorso(carpeta, formato)} alt="" style={imagen} onError={() => setFormato('png')} className="max-w-none" draggable={false} />
      <span className="tile-sheen" />
    </div>
  );
}
