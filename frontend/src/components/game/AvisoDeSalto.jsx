import { useEffect, useState } from 'react';

/** Cuanto se queda el cartelito en pantalla. */
const DURACION_MS = 3500;

/**
 * "A Fulano se le pasó el turno".
 *
 * Cuando a alguien se le acaba el tiempo, el turno cambia solo. Sin este aviso
 * eso parece un error del juego: te toca de golpe y no sabes por que.
 *
 * El servidor manda un contador junto al nombre. Hace falta: si al mismo
 * jugador le pasan dos turnos seguidos, el dato seria identico y el aviso no
 * volveria a salir.
 */
export default function AvisoDeSalto({ salto }) {
  const [visible, setVisible] = useState(false);

  const n = salto?.n ?? null;

  useEffect(() => {
    if (n == null) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), DURACION_MS);
    return () => clearTimeout(id);
  }, [n]);

  if (!visible || !salto) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-50 flex justify-center px-3">
      <div className="flex items-center gap-2 rounded-full border border-domino-accent/40 bg-black/85 px-3 py-1.5 shadow-lg backdrop-blur-sm">
        <span aria-hidden="true">⏱️</span>
        <span className="text-[11px] font-semibold leading-tight text-domino-cream sm:text-xs">
          A <span className="text-domino-accent">{salto.username}</span> se le pasó el turno
        </span>
      </div>
    </div>
  );
}
