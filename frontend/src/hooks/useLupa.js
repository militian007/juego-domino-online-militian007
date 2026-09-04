import { useEffect, useRef, useState } from 'react';

/**
 * La lupa de la mesa: acercar con dos dedos y soltar para volver.
 *
 * Pedido de Jonathan: *"que la gente le pueda hacer zoom a la mesa y el zoom
 * sea dinamico y que cuando suelte el zoom vuelva a su forma original"*.
 *
 * ## Que hace y que NO hace
 *
 * NO cambia el tamano con el que se dibuja la partida. La mesa se sigue
 * calculando igual que siempre: misma escala, misma camara, mismas fichas. Esto
 * es una lupa que se pone ENCIMA, como acercar la cara a la mesa. Por eso al
 * soltar vuelve sola: no hay nada que "recordar", el estado real nunca cambio.
 *
 * Eso importa por dos motivos:
 *
 * 1. Nadie puede quedarse trabado con la mesa torcida o mal acercada. Sueltas y
 *    volviste al mismo lugar donde estabas.
 * 2. El calculo de donde cae una ficha (el iman) sigue usando la escala de
 *    siempre, asi que acercar no descoloca donde se suelta la ficha.
 *
 * ## Como se acerca
 *
 * Se acerca en el punto donde estan los dedos, no en el centro de la pantalla.
 * Si pones los dedos sobre la punta izquierda de la cadena, se agranda esa
 * punta. Mientras esta acercado, mover los dos dedos arrastra la mesa, que es
 * lo que uno espera para ir a mirar la otra punta.
 *
 * @param {object} ref el paño donde se escuchan los dedos (el que ya existe)
 * @param {number} maximo cuanto se deja acercar como mucho
 * @returns {{estilo, acercado}} `estilo` va en lo que se quiere agrandar, y
 *   `acercado` avisa si en este momento hay dedos pellizcando
 */
export function useLupa(ref, maximo = 3) {

  // El estado del pellizco en curso. Va en un ref y no en useState porque
  // cambia en cada movimiento de dedo y no tiene que provocar re-render por si
  // mismo: el re-render lo pide `setLupa`, una sola vez por cuadro.
  const pellizco = useRef(null);

  const [lupa, setLupa] = useState({ escala: 1, x: 0, y: 0 });
  const [volviendo, setVolviendo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Distancia y punto medio entre los dos dedos, en coordenadas del paño.
    const medir = (toques) => {
      const caja = el.getBoundingClientRect();
      const [a, b] = [toques[0], toques[1]];
      return {
        distancia: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        x: (a.clientX + b.clientX) / 2 - caja.left,
        y: (a.clientY + b.clientY) / 2 - caja.top
      };
    };

    const empezar = (e) => {
      if (e.touches.length !== 2) return;
      const m = medir(e.touches);
      // Una distancia de cero seria una division por cero mas adelante.
      if (m.distancia < 1) return;
      pellizco.current = { distancia0: m.distancia, x0: m.x, y0: m.y, ancla: m };
      setVolviendo(false);
    };

    const mover = (e) => {
      const p = pellizco.current;
      if (!p || e.touches.length !== 2) return;

      // Sin esto el navegador se lleva el gesto y acerca la pagina entera.
      e.preventDefault();

      const m = medir(e.touches);
      const factor = Math.min(Math.max(m.distancia / p.distancia0, 1), maximo);

      // Acercar EN EL PUNTO donde estan los dedos: se corre el dibujo para que
      // ese punto se quede donde estaba mientras todo lo demas se agranda.
      const anclaX = p.ancla.x;
      const anclaY = p.ancla.y;

      setLupa({
        escala: factor,
        x: anclaX * (1 - factor) + (m.x - p.x0),
        y: anclaY * (1 - factor) + (m.y - p.y0)
      });
    };

    // Se suelta con que levante UN dedo: con uno solo ya no hay pellizco.
    const soltar = () => {
      if (!pellizco.current) return;
      pellizco.current = null;
      setVolviendo(true);
      setLupa({ escala: 1, x: 0, y: 0 });
    };

    // `passive: false` es obligatorio: sin eso el navegador ignora el
    // preventDefault y termina acercando la pagina en vez de la mesa.
    el.addEventListener('touchstart', empezar, { passive: false });
    el.addEventListener('touchmove', mover, { passive: false });
    el.addEventListener('touchend', soltar);
    el.addEventListener('touchcancel', soltar);

    return () => {
      el.removeEventListener('touchstart', empezar);
      el.removeEventListener('touchmove', mover);
      el.removeEventListener('touchend', soltar);
      el.removeEventListener('touchcancel', soltar);
    };
  }, [ref, maximo]);

  return {
    acercado: lupa.escala > 1,
    estilo: {
      transformOrigin: '0 0',
      transform: `translate(${lupa.x}px, ${lupa.y}px) scale(${lupa.escala})`,
      // Mientras los dedos mandan, la mesa sigue el dedo sin retraso. Al soltar
      // se anima la vuelta: de golpe se ve como un salto.
      transition: volviendo ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
      willChange: 'transform'
    }
  };
}
