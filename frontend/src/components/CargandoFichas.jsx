/**
 * La espera: una fila de fichas que se cae y se vuelve a parar.
 *
 * Antes habia un emoji de dado dando vueltas. Un dado no pinta nada en un juego
 * de domino, y ademas era un emoji, que cada telefono dibuja distinto.
 *
 * Las fichas son las MISMAS imagenes que se usan en la mesa, no un dibujo
 * aparte: se ve el mismo material y no hay arte nuevo que mantener. Cambian con
 * la pinta que tenga elegida el jugador, porque salen del contexto.
 */
import { useCarpetaDeFichas, VERSION_FICHAS } from './game/MesaTheme.jsx';

/** Cinco fichas cualesquiera. Se ven de canto, asi que los puntos casi no cuentan. */
const FILA = [
  [1, 1],
  [3, 4],
  [2, 6],
  [5, 5],
  [0, 3]
];

/** Cuanto tarda una ficha en empujar a la siguiente. */
const RETRASO = 0.14;

export default function CargandoFichas({ alto = 'h-14' }) {
  const carpeta = useCarpetaDeFichas();

  return (
    <div className={`flex items-end justify-center gap-[3px] ${alto}`} aria-label="Cargando">
      {FILA.map(([a, b], i) => (
        <span
          key={i}
          className="ficha-que-cae relative block h-full w-[22px]"
          style={{ animationDelay: `${i * RETRASO}s` }}
        >
          {/* La ficha viene acostada: se para girandola un cuarto de vuelta
              sobre su propio centro, y ese centro se clava en el centro de la
              casilla. Asi ocupa 22 de ancho por 56 de alto sin cuentas raras.

              El giro de la CAIDA va en el envoltorio: si los dos giros
              estuvieran en la imagen, se pisarian el mismo transform. */}
          <img
            src={`${carpeta}/tile_${a}_${b}.png?v=${VERSION_FICHAS}`}
            alt=""
            className="absolute left-1/2 top-1/2 h-[22px] w-14 max-w-none"
            style={{ transform: 'translate(-50%, -50%) rotate(-90deg)' }}
          />
        </span>
      ))}
    </div>
  );
}
