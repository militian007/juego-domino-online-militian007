import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket } from '../../services/socket.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * "Fulano te retó a jugar", con un minuto para contestar.
 *
 * Sale encima de todo, porque es algo que caduca: un aviso escondido en el
 * buzon se contesta cuando el otro ya se aburrio.
 *
 * La cuenta atras se ancla al reloj propio del aparato, igual que el reloj del
 * turno: el servidor manda CUANTO FALTA, no la hora, porque el reloj del
 * telefono puede estar corrido.
 */
export default function RetoEntrante() {
  const { user } = useAuth();
  const navegar = useNavigate();

  const [reto, setReto] = useState(null);
  const [quedan, setQuedan] = useState(0);
  const [error, setError] = useState(null);
  const ancla = useRef(null);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();
    if (!socket) return;

    const alRecibir = (r) => { setError(null); setReto(r); };
    const alCerrar = ({ id }) => setReto((r) => (r?.id === id ? null : r));
    const alAceptar = ({ code }) => { setReto(null); if (code) navegar(`/game/${code}`); };

    socket.on('reto:recibido', alRecibir);
    socket.on('reto:cerrado', alCerrar);
    socket.on('reto:aceptado', alAceptar);

    return () => {
      socket.off('reto:recibido', alRecibir);
      socket.off('reto:cerrado', alCerrar);
      socket.off('reto:aceptado', alAceptar);
    };
  }, [user, navegar]);

  useEffect(() => {
    if (!reto?.restanteMs) { ancla.current = null; return; }

    ancla.current = performance.now() + reto.restanteMs;
    setQuedan(reto.restanteMs);

    let vivo = true;
    const tic = () => {
      if (!vivo || ancla.current == null) return;
      const falta = Math.max(0, ancla.current - performance.now());
      setQuedan(falta);
      if (falta <= 0) { setReto(null); return; }
      id = requestAnimationFrame(tic);
    };
    let id = requestAnimationFrame(tic);
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [reto?.id, reto?.restanteMs]);

  if (!reto) return null;

  const responder = (acepto) => {
    connectSocket()?.emit('reto:responder', { id: reto.id, acepto }, (r) => {
      if (r?.ok === false) { setError(r.error); return; }
      if (!acepto) setReto(null);
      // Si acepto, la navegacion la dispara `reto:aceptado`, que llega a los dos.
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-domino-accent/35 bg-domino-dark p-6 text-center shadow-2xl">
        <div className="text-4xl" aria-hidden="true">⚔️</div>

        <h2 className="mt-3 text-xl font-semibold text-domino-cream">
          <span className="text-domino-accent">{reto.deNombre}</span> te retó
        </h2>
        <p className="mt-1 text-sm text-domino-cream/60">1 vs 1, mesa privada.</p>

        <p className="mt-4 text-3xl font-bold tabular-nums text-domino-accent">
          {Math.ceil(quedan / 1000)}s
        </p>
        <p className="text-[11px] tracking-widest text-domino-cream/40">PARA CONTESTAR</p>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => responder(false)}
            className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-domino-cream/75 transition hover:border-white/35 hover:text-domino-cream"
          >
            Ahora no
          </button>
          <button
            onClick={() => responder(true)}
            className="flex-1 rounded-lg bg-domino-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
