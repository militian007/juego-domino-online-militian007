import { useEffect, useRef, useState } from 'react';

/** A partir de cuando se muestra el circulito. */
const AVISO_DESDE_S = 10;

/**
 * La cuenta atras del turno.
 *
 * Solo aparece en los ultimos diez segundos, que es lo que pidio Jonathan: si
 * estuviera siempre, seria un reloj encima todo el rato y apura de gusto.
 *
 * ## Por que no usa la hora del servidor
 *
 * El servidor manda CUANTO FALTA, no a que hora vence. Si mandara la hora, un
 * telefono con el reloj corrido dibujaria una cuenta atras equivocada. Aca se
 * ancla ese "cuanto falta" al reloj propio del aparato en el momento en que
 * llega, y a partir de ahi se descuenta solo.
 *
 * Se usa `performance.now()` y no `Date.now()` porque no salta si el sistema
 * ajusta la hora a mitad de la cuenta.
 */
export default function RelojDeTurno({ restanteMs, total, esMiTurno, nombre }) {
  const [quedan, setQuedan] = useState(null);
  const ancla = useRef(null);

  // Cada vez que llega un valor nuevo del servidor se vuelve a anclar.
  useEffect(() => {
    if (restanteMs == null) {
      ancla.current = null;
      setQuedan(null);
      return;
    }
    ancla.current = performance.now() + restanteMs;
    setQuedan(restanteMs);
  }, [restanteMs]);

  useEffect(() => {
    if (ancla.current == null) return;

    let vivo = true;
    const tic = () => {
      if (!vivo || ancla.current == null) return;
      setQuedan(Math.max(0, ancla.current - performance.now()));
      id = requestAnimationFrame(tic);
    };
    let id = requestAnimationFrame(tic);

    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [restanteMs]);

  if (quedan == null || !total) return null;

  const segundos = Math.ceil(quedan / 1000);
  if (segundos > AVISO_DESDE_S) return null;

  // El anillo se vacia sobre los diez segundos del aviso, no sobre los 25:
  // asi el primer segundo que se ve ya empieza lleno.
  const fraccion = Math.max(0, Math.min(1, quedan / (AVISO_DESDE_S * 1000)));
  const RADIO = 26;
  const vuelta = 2 * Math.PI * RADIO;

  const urgente = segundos <= 5;
  const color = esMiTurno
    ? (urgente ? '#f87171' : '#e8c977')
    : 'rgba(232, 201, 119, 0.55)';

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
      <div className={`relative ${urgente && esMiTurno ? 'animate-pulse' : ''}`}>
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={RADIO} fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r={RADIO}
            fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={vuelta}
            strokeDashoffset={vuelta * (1 - fraccion)}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums"
          style={{ color }}
        >
          {segundos}
        </span>
      </div>

      <span className="mt-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-domino-cream/85">
        {esMiTurno ? 'JUGÁ' : (nombre ? nombre.toUpperCase() : 'RIVAL')}
      </span>
    </div>
  );
}
