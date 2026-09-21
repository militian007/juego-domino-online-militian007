import { useState } from 'react';
import { connectSocket } from '../services/socket.js';

/**
 * SUSPENDER DEL CHAT (copiado del truco; Raul, 14-sep-2026: «que se pueda
 * escoger cuantos dias y le salga un mensaje que vamos a escribirle»). La hoja
 * del socio: los dias (fichas o a mano) y el mensaje que el jugador va a leer
 * en la barra del chat.
 */
const DIAS = [1, 3, 7, 15, 30];

export default function SuspenderDelChat({ userId, username, onCerrar, onListo }) {
  const [dias, setDias] = useState(3);
  const [diasTexto, setDiasTexto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const diasFinal = diasTexto.trim() ? Number(diasTexto) : dias;
  const listo = Number.isInteger(diasFinal) && diasFinal >= 1 && diasFinal <= 365 && mensaje.trim().length >= 5;

  const suspender = () => {
    if (!listo || ocupado) return;
    setOcupado(true);
    connectSocket()?.emit('salon:silenciar', { userId, dias: diasFinal, mensaje: mensaje.trim() }, (r) => {
      setOcupado(false);
      if (!r?.ok) { setError(r?.error || 'No se pudo suspender'); return; }
      const hasta = new Date(r.hasta).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
      onListo?.(`${username} sin chat hasta el ${hasta}`);
    });
  };

  const levantar = () => {
    connectSocket()?.emit('salon:levantar', { userId }, (r) => {
      if (!r?.ok) { setError(r?.error || 'No se pudo levantar'); return; }
      onListo?.(`${username} vuelve a tener chat`);
    });
  };

  return (
    <div role="dialog" aria-label="Suspender del chat" className="fixed inset-0 z-[85] flex items-end justify-center">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md rounded-t-2xl bg-[#FFFDF7] p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-[#2B2419] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <p className="text-[15px] font-extrabold">Suspender a {username} del chat</p>
        <p className="mt-0.5 text-xs font-semibold text-[#5C5142]">Puede leer, no escribir. Va a ver tu mensaje en la barra del chat.</p>

        <p className="mt-3 text-[11px] font-bold tracking-[0.15em] text-[#7A5A16]">CUÁNTOS DÍAS</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {DIAS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDias(d); setDiasTexto(''); }}
              className={`rounded-full border px-3 py-1.5 text-sm font-extrabold ${!diasTexto && dias === d ? 'border-[#B9922F] bg-domino-accent' : 'border-[#C9B58A] bg-white'}`}
            >
              {d}
            </button>
          ))}
          <input
            value={diasTexto}
            onChange={(e) => setDiasTexto(e.target.value.replace(/\D/g, '').slice(0, 3))}
            inputMode="numeric"
            placeholder="otro"
            className="w-16 rounded-full border border-[#C9B58A] bg-white px-3 py-1.5 text-sm font-bold outline-none"
          />
        </div>

        <p className="mt-3 text-[11px] font-bold tracking-[0.15em] text-[#7A5A16]">EL MENSAJE QUE VA A LEER</p>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="Ej.: Acá no se insulta a nadie. Cuando vuelvas, con respeto."
          className="mt-1.5 w-full resize-none rounded-xl border border-[#C9B58A] bg-white px-3 py-2 text-sm font-medium outline-none"
        />

        {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}

        <button
          type="button"
          onClick={suspender}
          disabled={!listo || ocupado}
          className="mt-3 w-full rounded-2xl border-[1.5px] border-[#B9922F] bg-domino-accent py-3 text-sm font-extrabold disabled:opacity-40"
        >
          Suspender {diasFinal || ''} {diasFinal === 1 ? 'día' : 'días'}
        </button>
        <div className="mt-2 flex justify-between px-1">
          <button type="button" onClick={levantar} className="text-[13px] font-bold text-[#7A5A16]">Levantarle la suspensión</button>
          <button type="button" onClick={onCerrar} className="text-[13px] font-bold text-[#7A5A16]">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
