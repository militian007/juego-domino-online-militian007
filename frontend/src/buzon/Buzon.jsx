import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Bug, Lightbulb, X } from 'lucide-react';
import { identidad } from '../umbral/identidad.js';
import { idDeInvitado } from '../services/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { haySesion } from '../services/api.js';

/**
 * EL BUZON DE IDEAS Y FALLAS (seccion 200), copiado del truco (Raul, 14-sep:
 * el bombillo junto a la campana; 22-sep: «buzon de una, todas deben
 * tenerlo»). Un bombillo en la cabecera de la casa abre una hoja: escoges si
 * es una idea o algo que fallo, escribes y envias. No es un ticket: nadie
 * contesta, no hay codigo. Un gracias corto y se cierra.
 */
const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

/** El bombillo: la puerta del buzon, para la cabecera de cualquier pantalla de la casa. */
export function BombilloDelBuzon({ className = '' }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Buzón de ideas y fallas"
        data-buzon
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-domino-accent/40 bg-black/40 text-domino-accent ${className}`}
      >
        <Lightbulb size={17} strokeWidth={2.2} />
      </button>
      <HojaDelBuzon abierta={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}

export function HojaDelBuzon({ abierta, onCerrar, mesa = null, tipoInicial = 'idea' }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [tipo, setTipo] = useState(tipoInicial);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const [gracias, setGracias] = useState(false);

  useEffect(() => {
    if (!abierta) return undefined;
    setGracias(false); setError(null); setTipo(tipoInicial);
    return undefined;
  }, [abierta, tipoInicial]);

  useEffect(() => {
    if (!gracias) return undefined;
    const id = setTimeout(onCerrar, 2200);
    return () => clearTimeout(id);
  }, [gracias, onCerrar]);

  if (!abierta) return null;
  // La hoja va al cuerpo de la pagina (portal): el bombillo vive dentro de
  // cabeceras animadas, que son su propio contexto de apilado, y ahi abajo la
  // capsula del salon le pasaba por encima.
  const conCuenta = haySesion() && user;
  const yo = identidad();
  const quien = conCuenta ? { userId: String(user.id), username: user.username } : yo ? { userId: idDeInvitado(), username: yo.nombre } : null;

  const enviar = async () => {
    if (ocupado) return;
    if (!quien) { setError('Ponte un nombre en el umbral para dejar una nota.'); return; }
    if (texto.trim().length < 5) { setError('Cuéntanos un poquito más.'); return; }
    setOcupado(true); setError(null);
    try {
      const r = await fetch(`${API}/buzon`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipo, ...quien, pantalla: pathname, mesa, texto: texto.trim() })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || 'No se pudo enviar'); return; }
      setTexto('');
      setGracias(true);
    } catch {
      setError('No se pudo enviar. Revisa tu señal.');
    } finally {
      setOcupado(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-label="Buzón de ideas y fallas" className="fixed inset-0 z-[75] flex items-end justify-center">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-black/60" />
      {gracias ? (
        <div className="relative mb-24 w-[min(82%,380px)] rounded-2xl bg-[#FFFDF7] p-5 text-center text-[#2B2419] shadow-[0_10px_30px_rgba(0,0,0,0.6)]" data-buzon-gracias>
          <p className="text-[18px] font-extrabold" style={{ fontFamily: SERIF }}>¡Gracias!</p>
          <p className="mt-1.5 text-[13px] font-semibold text-[#5C5142]">Tu nota quedó en el buzón. La leemos todos los días y con eso vamos mejorando el club.</p>
        </div>
      ) : (
        <div className="relative w-full max-w-md rounded-t-2xl bg-[#FFFDF7] p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-[#2B2419] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-extrabold" style={{ fontFamily: SERIF }}>El buzón del club</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-[#5C5142]">
                {mesa
                  ? `Cuéntanos qué pasó en la mesa ${mesa}. Mandamos la libreta de la partida con tu nota.`
                  : 'Cuéntanos qué mejorar o qué te falló. Lo leemos todos los días.'}
              </p>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#C9B58A] text-[#7A5A16]"><X size={15} /></button>
          </div>
          <div className="mt-3 flex gap-2">
            <Chip on={tipo === 'idea'} onClick={() => setTipo('idea')} data-tipo="idea"><Lightbulb size={14} /> Una idea</Chip>
            <Chip on={tipo === 'falla'} onClick={() => setTipo('falla')} data-tipo="falla"><Bug size={14} /> Algo falló</Chip>
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, 600))}
            rows={4}
            data-buzon-texto
            placeholder={mesa ? '¿Qué pasó en esa partida?' : tipo === 'falla' ? '¿Qué estabas haciendo y qué pasó?' : 'Escribe aquí tu idea…'}
            className="mt-3 w-full resize-none rounded-xl border border-[#C9B58A] bg-white px-3 py-2 text-[14px] font-medium outline-none placeholder:text-[#8a7a5a]"
          />
          {error && <p className="mt-2 text-[12px] font-bold text-red-700" data-buzon-error>{error}</p>}
          <button
            type="button"
            onClick={enviar}
            disabled={ocupado || texto.trim().length < 5}
            data-buzon-enviar
            className="mt-3 w-full rounded-2xl border-[1.5px] border-[#B9922F] bg-domino-accent py-3 text-sm font-extrabold tracking-[0.05em] disabled:opacity-40"
          >
            {ocupado ? 'Enviando…' : 'Enviar al buzón'}
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

function Chip({ on, onClick, children, ...resto }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-extrabold ${on ? 'border-[#B9922F] bg-domino-accent' : 'border-[#C9B58A] bg-white'}`}
      {...resto}
    >
      {children}
    </button>
  );
}
