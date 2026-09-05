import { Link } from 'react-router-dom';

/**
 * Los dos atajos del borde derecho: torneos y clasificacion.
 *
 * Van ahi porque lo marco Jonathan en una captura, y porque en el telefono el
 * borde derecho es donde llega el pulgar sin tapar nada de la mesa. Sin
 * recuadro: solo el icono y el nombre, tambien a pedido suyo.
 *
 * Los iconos son la copa y el podio dorados que genero el con Gemini, no
 * dibujos de una libreria: pegan con el oro de la marca. Se preparan con
 * `npm run iconos-atajos`.
 */

const ATAJOS = [
  { a: '/torneos', icono: '/iconos/torneos.png', texto: 'TORNEOS' },
  { a: '/ranking', icono: '/iconos/tabla.png', texto: 'TABLA' }
];

export default function AtajosLaterales() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/3 z-20 flex flex-col gap-3 sm:right-5">
      {ATAJOS.map(({ a, icono, texto }) => (
        <Link
          key={a}
          to={a}
          className="pointer-events-auto flex w-16 flex-col items-center gap-1 text-domino-cream transition hover:brightness-125"
        >
          {/* La sombra es lo que los despega de la foto de la mesa, que tiene
              zonas claras. Sin ella el oro sobre el paño claro se pierde. */}
          <img
            src={icono}
            alt=""
            className="h-8 w-8 drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]"
          />
          <span className="text-[8px] font-semibold tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
            {texto}
          </span>
        </Link>
      ))}
    </div>
  );
}
