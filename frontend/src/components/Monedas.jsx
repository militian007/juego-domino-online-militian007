import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { monedasApi } from '../services/api.js';

/**
 * Las monedas que llevas ganadas (§133).
 *
 * Se ganan JUGANDO: 5 por partida entre personas, 15 mas si la ganas, y 25 la
 * primera victoria del dia. Contra la maquina no pagan — si pagaran, la forma
 * mas rapida de hacerse rico seria jugar solo contra la casa.
 *
 * **Es la puerta de la tienda.** Tocar el saldo lleva alli: es donde uno mira
 * cuando se pregunta "¿y esto para que sirve?", asi que es donde tiene que
 * estar la respuesta.
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
    <Link
      to="/tienda"
      title="Tus monedas · ir a la tienda"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-domino-accent/35 bg-black/40 px-2 py-0.5 transition hover:border-domino-accent hover:bg-black/60 ${className}`}
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
    </Link>
  );
}
