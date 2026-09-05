import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connectSocket } from '../../services/socket.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * "Subiste de nivel" del pase de batalla.
 *
 * Aparece arriba, chico, y se va solo a los seis segundos. No tapa la mesa ni
 * pide que se toque nada: el premio ya esta entregado cuando llega este cartel,
 * asi que no hay nada que reclamar. Es puro aviso.
 *
 * Si suben dos niveles de una (pasa al completar una mision gorda), llega un
 * solo aviso con el nivel al que se llego, no dos carteles seguidos.
 */
export default function AvisoDeNivel() {
  const { user } = useAuth();
  const [subida, setSubida] = useState(null);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();
    if (!socket) return;

    const alSubir = (datos) => setSubida(datos);
    socket.on('pase:subiste', alSubir);
    return () => socket.off('pase:subiste', alSubir);
  }, [user]);

  useEffect(() => {
    if (!subida) return;
    const id = setTimeout(() => setSubida(null), 6000);
    return () => clearTimeout(id);
  }, [subida]);

  if (!subida) return null;

  const cosas = (subida.premios ?? []).filter((p) => p.tipo === 'desbloqueo');

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-4">
      <Link
        to="/pase"
        onClick={() => setSubida(null)}
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-domino-accent/50 bg-domino-dark/95 px-4 py-3 shadow-2xl backdrop-blur transition hover:border-domino-accent"
      >
        <img src="/iconos/pase.png" alt="" className="h-9 w-9" />
        <div className="min-w-0">
          <p className="text-sm font-black text-domino-accent">
            ¡Nivel {subida.nivel} del pase!
          </p>
          <p className="truncate text-[11px] text-domino-cream/70">
            {cosas.length
              ? `Ganaste: ${cosas.map((c) => c.nombre).join(', ')}`
              : 'Tocá para ver lo que viene'}
          </p>
        </div>
      </Link>
    </div>
  );
}
