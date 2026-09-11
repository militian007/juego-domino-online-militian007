import { useEffect, useState } from 'react';
import { monedasApi } from '../services/api.js';

/**
 * Las monedas que llevas ganadas (§133).
 *
 * Se ganan JUGANDO: 5 por partida entre personas, 15 mas si la ganas, y 25 la
 * primera victoria del dia. Contra la maquina no pagan — si pagaran, la forma
 * mas rapida de hacerse rico seria jugar solo contra la casa.
 *
 * ## No hay tienda todavia
 *
 * A proposito. Lo unico que se desbloquea hoy son cuatro cosmeticos y los
 * cuatro son premios del pase: una tienda que los venda vacia el pase. Hasta
 * que se decida QUE vende, el saldo se muestra y se guarda, que es lo que hace
 * falta para cualquier camino que se elija despues.
 */
export default function Monedas({ className = '' }) {
  const [saldo, setSaldo] = useState(null);

  useEffect(() => {
    let vivo = true;
    monedasApi.mias()
      .then((r) => { if (vivo) setSaldo(r.saldo ?? 0); })
      // Un invitado no tiene monedas, y eso no es un error que haya que mostrar.
      .catch(() => { if (vivo) setSaldo(null); });
    return () => { vivo = false; };
  }, []);

  if (saldo == null) return null;

  return (
    <span
      title="Monedas que ganaste jugando"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-domino-accent/35 bg-black/40 px-2 py-0.5 ${className}`}
    >
      {/* La moneda: un circulo con brillo, no un icono dibujado a mano. */}
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #F7E7C4 0%, #E8C974 38%, #B8862F 100%)',
          boxShadow: 'inset 0 -1px 1px rgba(0,0,0,.35)'
        }}
      />
      <span className="text-[11px] font-bold tabular-nums text-domino-accent">{saldo}</span>
    </span>
  );
}
