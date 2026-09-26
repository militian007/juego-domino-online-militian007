import Avatar from './Avatar.jsx';
import ManoBocaAbajo from './ManoBocaAbajo.jsx';

/**
 * El jugador en su borde de la mesa: retrato, debajo el nombre y debajo la
 * cantidad de fichas, todo en horizontal.
 *
 * Sin caja alrededor y de ancho fijo. Antes iba en un rectangulo que cambiaba
 * de tamaño segun lo largo del nombre y con el texto de costado, que era
 * justo lo que el usuario no queria.
 */
export default function PlacaAsiento({ jugador, fichas, enTurno, esCompanero, className = '', abanicoOculto = false }) {
  if (!jugador) return null;
  return (
    <div
      className={`pointer-events-none absolute z-20 flex flex-col items-center gap-0.5 text-center ${
        esCompanero ? 'w-[86px]' : 'w-[52px]'
      } ${className}`}
      style={{ textShadow: '0 1px 3px rgba(0,0,0,.95)' }}
    >
      <div className="relative">
        <Avatar semilla={jugador.avatar || jugador.username} foto={jugador.foto} tamano={38} />
        {enTurno && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-black/70 bg-emerald-400" />
        )}
      </div>
      <span
        className={`w-full truncate text-[10px] font-bold leading-tight ${
          enTurno ? 'text-emerald-300' : esCompanero ? 'text-sky-200' : 'text-domino-cream'
        }`}
      >
        {jugador.username}
      </span>
      {/* Las fichas del rival, boca abajo. El numero se queda al lado: el
          abanico se corta en siete y a partir de ahi solo el numero dice
          cuantas son de verdad.

          "compa" va en la misma fila y no debajo (§150): asi en 2 vs 2 las
          tres placas miden lo mismo y el rectangulo de la cadena empieza
          justo por debajo de la fila, sin perder un renglon de mesa. */}
      <div className="flex items-end justify-center gap-1" data-mano-rival={jugador.id} style={{ visibility: abanicoOculto ? 'hidden' : 'visible' }}>
        <ManoBocaAbajo cantidad={fichas ?? 0} />
        <span className="text-[10px] font-bold leading-none text-domino-cream">{fichas ?? 0}</span>
        {esCompanero && (
          <span className="text-[9px] font-semibold uppercase leading-tight tracking-[0.16em] text-sky-200">compa</span>
        )}
      </div>
    </div>
  );
}
