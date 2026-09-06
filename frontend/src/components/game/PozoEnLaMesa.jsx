import { useMemo } from 'react';

/**
 * El pozo, como un monton de fichas tiradas en el medio de la mesa.
 *
 * Antes era una fila ordenada en el panel de abajo. Los amigos de Jonathan
 * pidieron que fuera lo que es en una mesa de verdad: **el monton**, boca
 * abajo, desordenado, y que uno elija cual levanta.
 *
 * ## El desorden esta calculado, no es al azar
 *
 * Si las posiciones salieran de `Math.random()`, el monton se reacomodaria
 * entero en cada dibujado —cada vez que alguien juega, cada vez que llega el
 * estado— y se veria como un temblor. Aca cada ficha saca su sitio y su angulo
 * de su propio numero de orden, asi que siempre cae en el mismo lugar.
 *
 * ## El azar ya paso
 *
 * El orden del pozo lo fijo la semilla al repartir y no vuelve a cambiar en
 * toda la mano. Elegir una ficha u otra no mejora ni empeora nada, pero la
 * decision es del jugador y no del servidor.
 */

/** El ancho de cada ficha del monton. */
const ANCHO = 24;

/** Cuanto se abre el monton, en pixeles. Es una elipse, mas ancha que alta. */
const ABIERTO_X = 70;
const ABIERTO_Y = 30;

/**
 * Un numero estable entre 0 y 1 a partir de dos enteros.
 *
 * Congruencial simple: alcanza de sobra para desparramar veintiocho fichas y
 * garantiza que la ficha numero cinco caiga siempre en el mismo sitio.
 */
const azarFijo = (i, sal) => {
  let h = (i + 1) * 374761393 + sal * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h >>> 8) / 16777216;
};

/**
 * Donde cae cada ficha.
 *
 * Se reparten en espiral y no a lo loco: a lo loco quedan huecos y grumos, y
 * el monton parece un charco. En espiral el monton crece parejo desde el centro
 * y siempre se ve como una pila.
 */
const armarMonton = (cuantas) =>
  Array.from({ length: cuantas }, (_, i) => {
    const vuelta = Math.sqrt((i + 0.5) / Math.max(1, cuantas));
    const angulo = i * 2.399963; // el angulo aureo: reparte sin alinear nada
    return {
      x: Math.cos(angulo) * vuelta * ABIERTO_X + (azarFijo(i, 1) - 0.5) * 12,
      y: Math.sin(angulo) * vuelta * ABIERTO_Y + (azarFijo(i, 2) - 0.5) * 10,
      giro: (azarFijo(i, 3) - 0.5) * 150
    };
  });

export default function PozoEnLaMesa({ cantidad = 0, activo = false, robando = false, onRobar }) {
  const monton = useMemo(() => armarMonton(cantidad), [cantidad]);

  if (!cantidad) return null;

  return (
    // Dos cosas cuando NO toca robar: no recibe toques —taparia los imanes
    // donde se sueltan las fichas— y se va DETRAS de la cadena. La cadena crece
    // desde el centro y tarde o temprano le pasa por encima al monton; que gane
    // la cadena, que es lo que hay que mirar para jugar. Cuando toca robar el
    // monton sube al frente, que ahi es lo unico que importa.
    <div
      className={`absolute left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2 ${
        activo ? 'z-20' : 'pointer-events-none z-0 opacity-90'
      }`}
    >
      <div className="relative" style={{ width: ABIERTO_X * 2 + ANCHO, height: ABIERTO_Y * 2 + ANCHO * 2 }}>
        {monton.map((f, i) => (
          <button
            key={i}
            type="button"
            disabled={!activo || robando}
            title={activo ? 'Levantar esta ficha' : `Quedan ${cantidad} en el pozo`}
            onClick={() => activo && !robando && onRobar?.(i)}
            style={{
              width: ANCHO,
              height: ANCHO * 1.8,
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${f.x}px, ${f.y}px) rotate(${f.giro}deg)`,
              zIndex: i
            }}
            className={`pool-tile absolute rounded-[3px] transition-[filter,box-shadow] ${
              activo && !robando
                ? 'cursor-pointer hover:z-30 hover:brightness-150 hover:ring-2 hover:ring-domino-accent'
                : 'cursor-default'
            }`}
          >
            <span className="sr-only">Ficha {i + 1} del pozo</span>
          </button>
        ))}
      </div>

      {/* El cartel va debajo del monton y no encima: encima tapa las fichas de
          arriba, que son justo las que uno quiere tocar. */}
      <p
        className={`pointer-events-none mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
          activo ? 'text-domino-accent' : 'text-domino-cream/45'
        }`}
      >
        {activo ? 'Levantá una' : `Pozo ${cantidad}`}
      </p>
    </div>
  );
}
