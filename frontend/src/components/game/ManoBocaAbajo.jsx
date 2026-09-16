import Dorso from './Dorso.jsx';

/**
 * Las fichas del rival, boca abajo.
 *
 * Antes de su asiento solo decia "5 fichas". Un numero es informacion; un
 * abanico de fichas es la MESA. Cuando el rival juega una, el abanico se achica
 * solo y se ve, que es lo que hace que la partida se sienta de verdad
 * (§123, punto 6 del plan de Domino Legends).
 *
 * El dorso no es un dibujo nuevo: es `Dorso`, la misma ficha de la pinta
 * elegida vista por detras (§185), la que usan el pozo y el reparto. Asi el
 * reverso es UNO en todo el juego. De 9 px de ancho paso a 12: a 9 no se le
 * veia la forma de ficha.
 */

/** Con mas de esto encima no se distinguen, y a nadie le importa el numero exacto. */
const MAXIMO_VISIBLE = 7;

export default function ManoBocaAbajo({ cantidad = 0, ancho = 12, className = '' }) {
  const cuantas = Math.min(Math.max(cantidad, 0), MAXIMO_VISIBLE);
  if (cuantas === 0) return null;

  const solape = Math.round(ancho * 0.55);

  return (
    <div className={`flex items-end justify-center ${className}`} aria-hidden="true">
      {Array.from({ length: cuantas }).map((_, i) => (
        <Dorso
          key={i}
          ancho={ancho}
          className="shrink-0"
          style={{
            marginLeft: i > 0 ? `-${solape}px` : 0,
            // Un pelin de abanico: perfectamente alineadas parecen una barra.
            transform: `rotate(${(i - (cuantas - 1) / 2) * 3}deg)`,
            transformOrigin: 'bottom center'
          }}
        />
      ))}
    </div>
  );
}
