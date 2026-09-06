import { useEffect, useRef, useState } from 'react';
import { connectSocket } from '../../services/socket.js';

/**
 * El chat de la mesa: hablar con los que estan jugando la partida.
 *
 * ## Dos formas de verlo, y las dos hacen falta
 *
 * 1. **La burbuja.** Lo que alguien acaba de decir aparece unos segundos al
 *    lado de su sitio en la mesa. Es lo que hace que el chat sirva: en una
 *    partida nadie va a estar abriendo un panel cada dos jugadas para ver si le
 *    hablaron.
 * 2. **El panel.** Se abre con el boton y trae lo dicho y el sitio para
 *    escribir. Es para cuando uno SI quiere leer o contestar.
 *
 * ## Solo entre personas
 *
 * Contra la maquina no se enciende: no hay con quien hablar y el boton solo
 * estorba. Quien decide es el servidor —rechaza el mensaje— pero el boton ni
 * siquiera se dibuja, que es mas honesto que ofrecerlo y despues negarlo.
 */

/** Cuanto se queda una burbuja en la mesa. */
const MS_BURBUJA = 5200;

/** Lo mismo que acepta el servidor. Aca solo evita mandar de mas. */
const LARGO_MAXIMO = 160;

export function useChatDeMesa(code, activo) {
  const [mensajes, setMensajes] = useState([]);
  const [ultimos, setUltimos] = useState([]);
  const [sinLeer, setSinLeer] = useState(0);
  const relojes = useRef([]);

  useEffect(() => {
    if (!activo || !code) {
      setMensajes([]);
      setUltimos([]);
      setSinLeer(0);
      return;
    }

    const socket = connectSocket();
    if (!socket) return;

    socket.emit('mesa:chat:entrar', { code }, (r) => {
      if (r?.ok) setMensajes(r.mensajes ?? []);
    });

    const alLlegar = (m) => {
      setMensajes((antes) => [...antes, m].slice(-40));
      setSinLeer((n) => n + 1);

      // La burbuja se va sola. Se guarda el reloj para poder cancelarlo si el
      // componente se desmonta a mitad, que si no React se queja.
      setUltimos((antes) => [...antes, m]);
      const reloj = setTimeout(() => {
        setUltimos((antes) => antes.filter((x) => x.id !== m.id));
      }, MS_BURBUJA);
      relojes.current.push(reloj);
    };

    socket.on('mesa:chat:mensaje', alLlegar);
    return () => {
      socket.off('mesa:chat:mensaje', alLlegar);
      relojes.current.forEach(clearTimeout);
      relojes.current = [];
    };
  }, [code, activo]);

  const enviar = (texto) =>
    new Promise((resolver) => {
      const socket = connectSocket();
      if (!socket) return resolver({ ok: false, error: 'Sin conexión' });
      socket.emit('mesa:chat:enviar', { code, texto }, (r) => resolver(r ?? { ok: false }));
    });

  return { mensajes, ultimos, sinLeer, marcarLeidos: () => setSinLeer(0), enviar };
}

/**
 * La burbuja de lo que alguien acaba de decir, al lado de su sitio.
 *
 * Entra con una animacion PROPIA, que solo toca la opacidad. La primera version
 * reusaba la de las fichas (`tile-place`), y esa termina en
 * `transform: scale(1) rotate(0)`: le pisaba el `-translate-x-1/2` con el que la
 * burbuja se centra, y aparecia torcida y corrida a un lado.
 */
export function BurbujaDeChat({ mensaje, className = '', style }) {
  if (!mensaje) return null;
  return (
    <div
      style={style}
      className={`burbuja-entra pointer-events-none absolute z-40 max-w-[160px] ${className}`}
    >
      <div className="rounded-2xl border border-domino-accent/40 bg-domino-dark/95 px-3 py-1.5 shadow-xl">
        <p className="break-words text-[11px] leading-snug text-domino-cream">{mensaje.texto}</p>
      </div>
    </div>
  );
}

export default function PanelDeChat({ abierto, onCerrar, mensajes, enviar, miId }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const final = useRef(null);

  useEffect(() => {
    if (abierto) final.current?.scrollIntoView({ block: 'end' });
  }, [abierto, mensajes.length]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(''), 2600);
    return () => clearTimeout(id);
  }, [error]);

  if (!abierto) return null;

  const mandar = async (e) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;

    setEnviando(true);
    const r = await enviar(limpio);
    setEnviando(false);

    if (r?.ok) setTexto('');
    else setError(r?.error || 'No se pudo enviar');
  };

  return (
    <>
      {/* El velo cierra el panel al tocar fuera. Va debajo del panel. */}
      <div className="fixed inset-0 z-40" onClick={onCerrar} />

      <div className="absolute left-1/2 top-1/2 z-50 flex h-[62%] w-[86%] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border-2 border-domino-accent/50 bg-domino-felt shadow-2xl">
        <div className="flex items-center justify-between border-b border-domino-accent/20 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-domino-accent/80">
            Chat de la mesa
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="text-lg leading-none text-domino-cream/50 transition hover:text-domino-cream"
            aria-label="Cerrar el chat"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
          {mensajes.length === 0 ? (
            <p className="pt-4 text-center text-xs text-domino-cream/45">
              Todavía no dijo nada nadie.
            </p>
          ) : (
            mensajes.map((m) => (
              <div key={m.id} className="text-sm leading-snug">
                <span
                  className={`text-[11px] font-semibold ${
                    String(m.userId) === String(miId) ? 'text-domino-accent' : 'text-domino-cream/85'
                  }`}
                >
                  {m.username}
                </span>
                {/* React escapa el texto solo: nadie mete HTML por aca. */}
                <p className="break-words text-[13px] text-domino-cream/80">{m.texto}</p>
              </div>
            ))
          )}
          <div ref={final} />
        </div>

        {error && (
          <p className="px-3 pb-1 text-center text-[11px] text-red-400">{error}</p>
        )}

        <form onSubmit={mandar} className="flex gap-2 border-t border-domino-accent/20 p-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LARGO_MAXIMO))}
            placeholder="Escribí algo..."
            maxLength={LARGO_MAXIMO}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-domino-accent/25 bg-black/40 px-3 py-2 text-sm text-domino-cream placeholder:text-domino-cream/30 focus:border-domino-accent/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            className="shrink-0 rounded-lg bg-domino-accent px-3 py-2 text-sm font-bold text-domino-dark transition disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      </div>
    </>
  );
}
