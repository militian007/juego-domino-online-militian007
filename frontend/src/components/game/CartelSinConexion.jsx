import { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';

const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

/**
 * "Se te cayo la conexion" (seccion 191, ficha 2.3 de la plantilla).
 *
 * Es para el que SE CAYO, no para los demas (a ellos les sale el aviso de
 * ausente). En el truco, 25 o 30 personas al dia perdian sin enterarse de que
 * el juego las seguia esperando: este cartel les dice cuanto tienen para
 * volver, en grande. El socket se reconecta solo; cuando vuelve, el cartel se
 * va. La cuenta se pone al dia una vez por segundo (piso 0).
 */
export default function CartelSinConexion({ desde, graciaMs, onReintentar, onSalir }) {
  const [quedan, setQuedan] = useState(null);
  const ancla = useRef(null);

  useEffect(() => {
    if (!desde || !graciaMs) { setQuedan(null); return undefined; }
    ancla.current = desde + graciaMs;
    let vivo = true;
    let ultimo = null;
    const tic = () => {
      if (!vivo) return;
      const s = Math.ceil((ancla.current - Date.now()) / 1000);
      if (s !== ultimo) { ultimo = s; setQuedan(Math.max(0, s)); }
      id = requestAnimationFrame(tic);
    };
    let id = requestAnimationFrame(tic);
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [desde, graciaMs]);

  if (!desde || quedan == null) return null;

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-6 ${quedan === 0 ? '' : 'pointer-events-none'}`}>
      <div className="w-full max-w-xs rounded-2xl border border-domino-accent/60 bg-[#09160f]/95 px-5 pb-5 pt-4 text-center shadow-[0_12px_40px_rgba(0,0,0,.8)]">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-domino-accent/60 bg-black/40 text-domino-accent">
          <WifiOff size={24} strokeWidth={2} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-domino-accent" style={{ fontFamily: SERIF }}>
          Se te cayó la conexión
        </p>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-domino-cream">
          La mesa te espera. Tienes
        </p>
        <p className="my-1 text-[64px] font-bold leading-none tabular-nums text-domino-accent" style={{ fontFamily: SERIF }}>
          {quedan}
        </p>
        <p className="text-[13px] font-semibold text-domino-cream/80">
          {quedan === 0 ? 'Se acabó el tiempo: la partida sigue sin ti.' : 'segundos para volver. Revisa tu señal.'}
        </p>
        {/* Al llegar a cero, dos salidas (plantilla, ficha 2.3): reintentar, o
            irse al salon. Antes el cartel se quedaba mudo y el jugador preso. */}
        {quedan === 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={onReintentar} data-reintentar className="btn-primary w-full py-3 text-sm tracking-[0.2em]">REINTENTAR AHORA</button>
            <button type="button" onClick={onSalir} data-salir-salon className="w-full rounded-xl border border-domino-accent/55 bg-black/35 py-3 text-[12px] font-extrabold tracking-[0.2em] text-domino-accent">SALIR AL SALÓN</button>
          </div>
        )}
      </div>
    </div>
  );
}
