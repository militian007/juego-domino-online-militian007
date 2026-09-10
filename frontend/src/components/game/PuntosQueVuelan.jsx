import { useLayoutEffect, useState } from 'react';

/**
 * Los pips del perdedor viajando hasta el total de la ronda.
 *
 * Ultima parte del punto 5 del plan (§123): *"Al cerrar la ronda, las insignias
 * de pips salen de las fichas del perdedor y viajan hasta el marcador"*. Sin
 * esto el "+22 puntos" es un numero que aparece; con esto se VE de donde salio,
 * que es lo que hace que la cuenta se entienda sin leerla.
 *
 * ## Como encuentra las dos puntas
 *
 * Por atributos en el HTML, no por refs pasados de mano en mano: el origen es
 * cada `[data-pips-volando]` del desglose y el destino es `[data-total-puntos]`.
 * Los dos viven en el mismo panel pero en componentes distintos, y encadenar
 * refs entre ellos ensuciaria los dos para nada.
 *
 * ## Copias, no los originales
 *
 * Lo que viaja es una COPIA. El numero de pips del desglose se queda donde
 * esta: sirve para comprobar la cuenta a mano, y no puede irse volando.
 */

/** Cuanto tarda cada uno en llegar. */
const MS_VIAJE = 800;

/** Cuanto espera cada uno respecto del anterior, para que salgan en fila. */
const MS_ENTRE = 130;

export default function PuntosQueVuelan({ contenedor, activo }) {
  const [viajes, setViajes] = useState([]);

  useLayoutEffect(() => {
    if (!activo) {
      setViajes([]);
      return;
    }
    const raiz = contenedor?.current;
    if (!raiz) return;

    const destino = raiz.querySelector('[data-total-puntos]');
    const origenes = [...raiz.querySelectorAll('[data-pips-volando]')];
    if (!destino || origenes.length === 0) return;

    const caja = raiz.getBoundingClientRect();
    const d = destino.getBoundingClientRect();

    setViajes(
      origenes.map((el, i) => {
        const o = el.getBoundingClientRect();
        return {
          id: i,
          texto: el.textContent,
          x: o.left - caja.left,
          y: o.top - caja.top,
          dx: d.left + d.width / 2 - (o.left + o.width / 2),
          dy: d.top + d.height / 2 - (o.top + o.height / 2),
          demora: i * MS_ENTRE
        };
      })
    );
  }, [activo, contenedor]);

  if (viajes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {viajes.map((v) => (
        <span
          key={v.id}
          className="pip-vuela absolute whitespace-nowrap rounded-full bg-domino-accent px-2 py-0.5 text-[11px] font-black text-domino-dark shadow-lg"
          style={{
            left: `${v.x}px`,
            top: `${v.y}px`,
            '--pip-dx': `${v.dx}px`,
            '--pip-dy': `${v.dy}px`,
            animationDelay: `${v.demora}ms`,
            animationDuration: `${MS_VIAJE}ms`
          }}
        >
          {v.texto}
        </span>
      ))}
    </div>
  );
}
