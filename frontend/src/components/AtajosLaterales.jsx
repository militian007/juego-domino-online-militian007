import { Link } from 'react-router-dom';
import { Trophy, BarChart3 } from 'lucide-react';

/**
 * Los dos atajos del borde derecho: torneos y clasificacion.
 *
 * Van ahi porque lo marco Jonathan en una captura, y porque en el telefono el
 * borde derecho es donde llega el pulgar sin tapar nada de la mesa.
 *
 * Antes los puntos y el puesto salian arriba, al lado del nombre. Se sacaron:
 * los pidio fuera y el puesto ya se ve en la clasificacion y en el perfil.
 *
 * Los iconos son de `lucide-react`, no dibujados a mano. Regla de oro 1.1.
 */

const ATAJOS = [
  { a: '/torneos', Icono: Trophy, texto: 'TORNEOS' },
  { a: '/ranking', Icono: BarChart3, texto: 'TABLA' }
];

export default function AtajosLaterales() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/3 z-20 flex flex-col gap-2.5 sm:right-5">
      {ATAJOS.map(({ a, Icono, texto }) => (
        <Link
          key={a}
          to={a}
          className="pointer-events-auto flex w-14 flex-col items-center gap-1 text-domino-cream transition hover:brightness-125"
        >
          {/* Sin recuadro, solo el icono y el nombre: lo pidio asi Jonathan.
              La sombra en el texto y el trazo del icono son lo que los hace
              legibles sobre la foto de la mesa, que tiene zonas claras. */}
          <Icono
            size={22}
            className="text-domino-accent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            aria-hidden="true"
          />
          <span className="text-[8px] font-semibold tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
            {texto}
          </span>
        </Link>
      ))}
    </div>
  );
}
