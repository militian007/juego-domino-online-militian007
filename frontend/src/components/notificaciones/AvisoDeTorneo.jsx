import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { connectSocket } from '../../services/socket.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * "Te toca jugar" en un torneo.
 *
 * Sale encima de todo, con la cuenta atras, porque es lo que mas urge de todo
 * lo que manda el servidor: si no entras a la mesa a tiempo quedas fuera del
 * cuadro, y con vos se traba la ronda de los demas.
 *
 * NO entra solo a la mesa. Se penso en hacerlo, pero sacar a alguien de golpe
 * de lo que esta haciendo es peor que perderse un torneo gratis: el boton
 * grande y el reloj a la vista alcanzan.
 */
export default function AvisoDeTorneo() {
  const { user } = useAuth();
  const navegar = useNavigate();

  const [mesa, setMesa] = useState(null);
  const [quedan, setQuedan] = useState(0);
  const ancla = useRef(null);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();
    if (!socket) return;

    const alTocar = (m) => setMesa(m);
    socket.on('torneo:partida', alTocar);
    return () => socket.off('torneo:partida', alTocar);
  }, [user]);

  useEffect(() => {
    if (!mesa?.esperaMs) { ancla.current = null; return; }

    ancla.current = performance.now() + mesa.esperaMs;
    setQuedan(mesa.esperaMs);

    let vivo = true;
    const tic = () => {
      if (!vivo || ancla.current == null) return;
      const falta = Math.max(0, ancla.current - performance.now());
      setQuedan(falta);
      if (falta <= 0) { setMesa(null); return; }
      id = requestAnimationFrame(tic);
    };
    let id = requestAnimationFrame(tic);
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [mesa?.code, mesa?.esperaMs]);

  if (!mesa) return null;

  const entrar = () => {
    const code = mesa.code;
    setMesa(null);
    navegar(`/game/${code}`);
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-domino-accent/40 bg-domino-dark p-6 text-center shadow-2xl">
        <Swords size={38} className="mx-auto text-domino-accent" aria-hidden="true" />

        <p className="mt-3 text-[11px] font-semibold tracking-[0.3em] text-domino-cream/45">
          {mesa.torneo?.toUpperCase()}
        </p>
        <h2 className="mt-1 text-xl font-bold text-domino-cream">Te toca jugar</h2>
        <p className="mt-1 text-sm text-domino-cream/65">
          Contra <span className="font-semibold text-domino-accent">{mesa.contra}</span>
        </p>

        <p className="mt-4 text-3xl font-black tabular-nums text-domino-accent">
          {Math.ceil(quedan / 1000)}s
        </p>
        <p className="text-[11px] tracking-widest text-domino-cream/40">PARA ENTRAR</p>

        <button
          onClick={entrar}
          className="mt-5 w-full rounded-lg bg-domino-accent px-4 py-3 text-sm font-black tracking-wider text-black transition hover:brightness-110"
        >
          ENTRAR A LA MESA
        </button>

        <p className="mt-3 text-[10px] leading-relaxed text-domino-cream/40">
          Si no entrás a tiempo quedás fuera del torneo.
        </p>
      </div>
    </div>
  );
}
