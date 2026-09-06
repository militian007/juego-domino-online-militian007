import { useEffect, useMemo, useRef, useState } from 'react';
import { playShuffleSound } from '../../utils/soundEffects.js';

/**
 * El pozo: entra a la mesa solo cuando toca robar, y se va cuando termina.
 *
 * Asi lo pidio Jonathan, con las palabras de sus amigos: la mesa se ve normal,
 * y **solo cuando a uno le toca agarrar del pozo** las fichas aparecen
 * desparramadas por toda la mesa, boca abajo. Se barajean —se ven
 * revolviendose— y quedan quietas. La persona agarra una, y si todavia no
 * puede jugar agarra otra, y otra, hasta que le salga. Apenas termina, las
 * fichas se quitan de la mesa y se sigue jugando normal.
 *
 * **Lo ve solo quien esta robando.** Decision de Jonathan. El rival sigue
 * viendo su mesa normal, asi que esto no necesita nada del servidor: se dibuja
 * con lo que el cliente ya sabe (`canDraw` es suyo y de nadie mas).
 *
 * ## Por que las posiciones se guardan en una lista y no se recalculan
 *
 * Mientras uno esta agarrando, las fichas que quedan **no se pueden mover**: si
 * se recalcularan por la cantidad, al levantar una se reacomodarian todas y uno
 * perderia de vista la que estaba por tocar. Se guarda una lista de sitios y al
 * levantar la ficha numero j se saca el sitio j; las demas se quedan donde
 * estaban, y la cuenta sigue calzando con la del servidor (la ficha visible
 * numero j es la ficha j del pozo, antes y despues).
 */

/**
 * Cuanto se mete el reparto dentro del rectangulo util, en fracciones.
 *
 * El rectangulo util lo marcan los MISMOS margenes que recibe el tablero: por
 * fuera de ahi estan la mano, las placas de los jugadores y la baranda. Sin
 * esto, media docena de fichas caian tapadas por la mano.
 */
const AREA = { x1: 0.04, x2: 0.96, y1: 0.05, y2: 0.95 };

/** Cuanto dura cada revoltijo y cuantos hay antes de que queden quietas. */
const MS_REVOLTIJO = 190;
const REVOLTIJOS = 4;

/** El ancho de la ficha boca abajo, en pixeles. */
const ANCHO = 30;

/**
 * Reparte `cuantas` fichas por toda el area, sin grumos.
 *
 * Rejilla con temblor: se divide el area en casillas, una ficha por casilla, y
 * cada una se corre un poco al azar dentro de la suya. Tirandolas del todo al
 * azar quedan pilas en un lado y huecos en el otro; asi cubren parejo y aun asi
 * se ven desordenadas.
 */
const repartir = (cuantas) => {
  const columnas = Math.max(1, Math.ceil(Math.sqrt(cuantas * 1.6)));
  const filas = Math.max(1, Math.ceil(cuantas / columnas));

  const casillas = [];
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) casillas.push([c, f]);
  }
  // Se barajan las casillas para que las que sobran no queden todas al final.
  for (let i = casillas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [casillas[i], casillas[j]] = [casillas[j], casillas[i]];
  }

  const anchoCasilla = (AREA.x2 - AREA.x1) / columnas;
  const altoCasilla = (AREA.y2 - AREA.y1) / filas;

  return casillas.slice(0, cuantas).map(([c, f]) => ({
    x: AREA.x1 + (c + 0.15 + Math.random() * 0.7) * anchoCasilla,
    y: AREA.y1 + (f + 0.15 + Math.random() * 0.7) * altoCasilla,
    giro: Math.random() * 360
  }));
};

export default function PozoEnLaMesa({
  cantidad = 0,
  activo = false,
  robando = false,
  onRobar,
  /** Los mismos margenes que recibe el tablero, en pixeles. */
  margenes = { arriba: 0, derecha: 0, abajo: 0, izquierda: 0 }
}) {
  const [sitios, setSitios] = useState([]);
  const [barajeando, setBarajeando] = useState(false);
  const relojes = useRef([]);

  const limpiarRelojes = () => {
    relojes.current.forEach(clearTimeout);
    relojes.current = [];
  };

  // Entra: aparecen, se revuelven unas cuantas veces y quedan quietas.
  useEffect(() => {
    limpiarRelojes();

    if (!activo || !cantidad) {
      setSitios([]);
      setBarajeando(false);
      return;
    }

    setBarajeando(true);
    setSitios(repartir(cantidad));
    playShuffleSound(REVOLTIJOS * MS_REVOLTIJO);

    for (let i = 1; i <= REVOLTIJOS; i++) {
      relojes.current.push(
        setTimeout(() => {
          setSitios(repartir(cantidad));
          if (i === REVOLTIJOS) setBarajeando(false);
        }, i * MS_REVOLTIJO)
      );
    }

    return limpiarRelojes;
    // A proposito NO depende de `cantidad`: si dependiera, cada ficha que uno
    // levanta volveria a barajear todo el pozo y no se podria elegir nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  const levantar = (j) => {
    if (barajeando || robando) return;
    onRobar?.(j);
    // La ficha se va de la mesa y las demas se quedan donde estaban.
    setSitios((antes) => antes.filter((_, i) => i !== j));
  };

  const visibles = useMemo(() => sitios.slice(0, cantidad), [sitios, cantidad]);

  if (!activo || !cantidad || !visibles.length) return null;

  return (
    <div className="absolute inset-0 z-30">
      {/* El velo cubre la mesa ENTERA y no solo el rectangulo util: cortandolo
          en el margen se veia el escalon, una franja clara pegada a la mano. */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Las fichas si van dentro del rectangulo util —los mismos margenes que
          recibe el tablero—, o caen tapadas por la mano y por las placas. */}
      <div
        className="absolute"
        style={{
          top: margenes.arriba,
          right: margenes.derecha,
          bottom: margenes.abajo,
          left: margenes.izquierda
        }}
      >
      {visibles.map((s, j) => (
        <button
          key={j}
          type="button"
          disabled={barajeando || robando}
          title={barajeando ? 'Barajando...' : 'Levantar esta ficha'}
          onClick={() => levantar(j)}
          style={{
            width: ANCHO,
            height: Math.round(ANCHO * 1.85),
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            transform: `translate(-50%, -50%) rotate(${s.giro}deg)`,
            transition: `left ${MS_REVOLTIJO}ms ease-in-out, top ${MS_REVOLTIJO}ms ease-in-out, transform ${MS_REVOLTIJO}ms ease-in-out`
          }}
          className={`pool-tile absolute rounded-[3px] ${
            barajeando
              ? 'cursor-default'
              : 'cursor-pointer hover:z-10 hover:brightness-150 hover:ring-2 hover:ring-domino-accent'
          }`}
        >
          <span className="sr-only">Ficha {j + 1} del pozo</span>
        </button>
      ))}

      </div>

      {/* El cartel va arriba, PERO por debajo de la placa del rival: pegado al
          borde le caia encima al nombre —medido: la placa termina cerca de los
          ochenta pixeles—. Y en pastilla, que sobre las fichas
          desparramadas el texto suelto no se lee. */}
      <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center">
        <span className="rounded-full border border-domino-accent/40 bg-black/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-domino-accent">
          {barajeando ? 'Barajando' : `Levantá una · quedan ${cantidad}`}
        </span>
      </div>
    </div>
  );
}
