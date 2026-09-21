import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { connectSocket } from '../services/socket.js';

/**
 * LA PUERTA DEL SALON: la capsula «N en linea · CHAT», copiada del truco
 * (Raul, 14-sep: «donde esta esta bien, pero mas grande y llamativo, con las
 * letras mas gorditas»). Fondo oscuro, borde bronce con brillo, el punto
 * verde que respira, y la palabra CHAT en una ficha dorada.
 *
 * El numero sale del `presence:count` que el servidor ya emite a todos.
 */
export default function PuertaDelSalon({ onAbrir, className = '' }) {
  const [cuantos, setCuantos] = useState(null);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;
    const alContar = (c) => setCuantos(Number(c?.total) || 0);
    socket.on('presence:count', alContar);
    return () => { socket.off('presence:count', alContar); };
  }, []);

  return (
    <button
      type="button"
      onClick={onAbrir}
      data-puerta-salon
      className={`inline-flex items-center gap-2 rounded-full border-[1.5px] border-domino-accent/85 bg-[#060a07]/90 py-2 pl-3.5 pr-2.5 shadow-[0_0_0_3px_rgba(212,175,55,0.14),0_6px_18px_rgba(0,0,0,0.6)] ${className}`}
    >
      <span className="salon-late h-[9px] w-[9px] shrink-0 rounded-full bg-[#3ddc84] shadow-[0_0_8px_#3ddc84]" aria-hidden />
      <span className="whitespace-nowrap text-sm font-extrabold tracking-[0.03em] text-domino-cream">
        {cuantos == null ? 'En línea' : `${cuantos} en línea`}
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-black tracking-[0.1em] text-[#2B2419] shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
        style={{ background: 'linear-gradient(180deg, #F2D98A 0%, #D8B45C 60%, #B9922F 100%)' }}
      >
        <MessageCircle size={15} strokeWidth={2.5} />
        CHAT
      </span>
    </button>
  );
}
