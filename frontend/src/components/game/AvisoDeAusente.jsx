import { useEffect, useRef, useState } from 'react';

/**
 * "Fulano se desconecto, tiene 60 segundos para volver".
 *
 * Igual que el reloj del turno, se ancla al "cuanto falta" que manda el
 * servidor y descuenta con el reloj propio del aparato: la hora del servidor no
 * sirve porque la del telefono puede estar corrida.
 *
 * Si no vuelve a tiempo, abandona la partida. Eso lo decide el servidor; aca
 * solo se avisa.
 */
export default function AvisoDeAusente({ ausentes }) {
  const [quedan, setQuedan] = useState(null);
  const ancla = useRef(null);

  const primero = ausentes?.[0] ?? null;
  const restanteMs = primero?.restanteMs ?? null;

  useEffect(() => {
    if (restanteMs == null) {
      ancla.current = null;
      setQuedan(null);
      return;
    }
    ancla.current = performance.now() + restanteMs;
    setQuedan(restanteMs);

    let vivo = true;
    const tic = () => {
      if (!vivo || ancla.current == null) return;
      setQuedan(Math.max(0, ancla.current - performance.now()));
      id = requestAnimationFrame(tic);
    };
    let id = requestAnimationFrame(tic);
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [restanteMs, primero?.username]);

  if (!primero || quedan == null) return null;

  const segundos = Math.ceil(quedan / 1000);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-50 flex justify-center px-3">
      <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/85 px-3 py-1.5 shadow-lg backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        <span className="text-[11px] font-semibold leading-tight text-domino-cream sm:text-xs">
          {primero.username} se desconectó ·{' '}
          <span className="tabular-nums text-amber-300">{segundos}s</span> para volver
        </span>
      </div>
    </div>
  );
}
