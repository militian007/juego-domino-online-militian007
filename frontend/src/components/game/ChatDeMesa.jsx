import { useEffect, useRef, useState } from 'react';
import { connectSocket } from '../../services/socket.js';

/**
 * El chat de la mesa: hablar con los que estan jugando la partida.
 *
 * ## Dos formas de verlo, y las dos hacen falta (ficha 5.2, como el truco el 23-sep)
 *
 * 1. **La burbuja.** Lo que alguien acaba de decir aparece SEIS segundos al
 *    lado de su sitio en la mesa (tres no alcanzan para leer cuarenta letras).
 *    Como mucho tres a la vez: mas que eso tapa la mesa.
 * 2. **La tira.** Se abre con el boton y trae lo ultimo que se dijo en ESTA
 *    partida, con quien lo dijo, y el sitio para escribir. Se cierra sola a los
 *    cinco segundos y mientras esta abierta no salen burbujas (seria lo mismo
 *    dos veces). Si uno se pone a escribir, deja de contar.
 *
 * ## Solo entre personas
 *
 * Contra la maquina no se enciende: no hay con quien hablar y el boton solo
 * estorba. Quien decide es el servidor —rechaza el mensaje— pero el boton ni
 * siquiera se dibuja, que es mas honesto que ofrecerlo y despues negarlo.
 */

/** Cuanto se queda una burbuja en la mesa. Lo manda la Config de la casa. */
const MS_BURBUJA = 6000;
/** Cuantas burbujas a la vez. */
const BURBUJAS = 3;
/** Cuanto se queda abierta la tira sin que nadie la toque. */
const MS_TIRA = 5000;

/** Lo mismo que acepta el servidor. Aca solo evita mandar de mas. */
const LARGO_MAXIMO = 160;

export function useChatDeMesa(code, activo) {
  const [mensajes, setMensajes] = useState([]);
  const [ultimos, setUltimos] = useState([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [tira, setTira] = useState([]);
  const [tiraAbierta, setTiraAbierta] = useState(false);
  const [puedoEscribir, setPuedoEscribir] = useState(true);
  const relojes = useRef([]);
  const relojTira = useRef(null);
  const msBurbuja = useRef(MS_BURBUJA);

  useEffect(() => {
    if (!activo || !code) {
      setMensajes([]);
      setUltimos([]);
      setSinLeer(0);
      setTira([]);
      setTiraAbierta(false);
      return;
    }

    const socket = connectSocket();
    if (!socket) return;

    socket.emit('mesa:chat:entrar', { code }, (r) => {
      if (!r?.ok) { setPuedoEscribir(false); return; }
      setMensajes(r.mensajes ?? []);
      setTira(r.tira ?? []);
      setPuedoEscribir(r.puedoEscribir !== false);
      if (Number.isFinite(r.burbujaMs)) msBurbuja.current = r.burbujaMs;
    });

    const alLlegar = (m) => {
      setMensajes((antes) => [...antes, m].slice(-40));
      setSinLeer((n) => n + 1);

      // La burbuja se va sola. Se guarda el reloj para poder cancelarlo si el
      // componente se desmonta a mitad, que si no React se queja.
      setUltimos((antes) => [...antes, m].slice(-BURBUJAS));
      const reloj = setTimeout(() => {
        setUltimos((antes) => antes.filter((x) => x.id !== m.id));
      }, msBurbuja.current);
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

  const pararReloj = () => {
    clearTimeout(relojTira.current);
    relojTira.current = null;
  };

  const cerrarTira = () => {
    pararReloj();
    setTiraAbierta(false);
  };

  /** El reloj de los cinco segundos. Se reinicia cada vez que alguien la toca. */
  const contarParaCerrar = () => {
    pararReloj();
    relojTira.current = setTimeout(() => setTiraAbierta(false), MS_TIRA);
  };

  const abrirTira = () => {
    const socket = connectSocket();
    socket?.emit('mesa:chat:tira', { code }, (r) => { if (r?.ok) setTira(r.tira ?? []); });
    setSinLeer(0);
    setUltimos([]);
    setTiraAbierta(true);
    contarParaCerrar();
  };

  useEffect(() => () => clearTimeout(relojTira.current), []);

  return {
    mensajes,
    // Mientras la tira esta abierta no hay burbujas: seria lo mismo dos veces.
    ultimos: tiraAbierta ? [] : ultimos,
    tira,
    tiraAbierta,
    abrirTira,
    cerrarTira,
    pararReloj,
    contarParaCerrar,
    puedoEscribir,
    sinLeer,
    marcarLeidos: () => setSinLeer(0),
    enviar
  };
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

/**
 * LA TIRA (ficha 5.2): lo ultimo que se dijo en esta partida, con quien lo
 * dijo, encima de la mano. No es un panel que tape la mesa: se lee de un
 * vistazo y se va sola.
 */
export default function TiraDeChat({ abierta, onCerrar, tira, enviar, miId, puedoEscribir, alTocar, style }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!error) return undefined;
    const id = setTimeout(() => setError(''), 2600);
    return () => clearTimeout(id);
  }, [error]);

  if (!abierta) return null;

  const mandar = async (e) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    const r = await enviar(limpio);
    setEnviando(false);
    if (r?.ok) {
      setTexto('');
      if (r.seQuitoContacto) setError('Quitamos un enlace: acá no se comparten links ni teléfonos.');
    } else setError(r?.error || 'No se pudo enviar');
  };

  return (
    <div
      data-tira-chat
      onPointerDown={alTocar}
      style={style}
      className="absolute inset-x-2 z-50 rounded-2xl border border-domino-accent/45 bg-domino-dark/95 p-2 shadow-2xl"
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[9px] font-black uppercase tracking-[0.24em] text-domino-accent">En la mesa</span>
        <button type="button" onClick={onCerrar} aria-label="Cerrar el chat" className="text-lg leading-none text-domino-cream-dim">×</button>
      </div>

      <div className="space-y-1">
        {tira.length === 0 ? (
          <p className="py-1 text-center text-[12px] font-medium text-domino-cream-dim">Todavía nadie ha dicho nada.</p>
        ) : (
          tira.map((m) => (
            <p key={m.id} className="text-[13px] font-medium leading-snug text-domino-cream">
              <span className={`text-[11px] font-black ${String(m.userId) === String(miId) ? 'text-domino-accent' : 'text-[#8FBF9F]'}`}>
                {String(m.userId) === String(miId) ? 'Tú' : m.username}
              </span>{' '}
              {m.texto}
            </p>
          ))
        )}
      </div>

      {error && <p className="px-1 pt-1 text-[11px] font-semibold text-red-300">{error}</p>}

      {puedoEscribir ? (
        <form onSubmit={mandar} className="mt-1.5 flex gap-2">
          <input
            value={texto}
            onChange={(e) => { setTexto(e.target.value.slice(0, LARGO_MAXIMO)); alTocar?.(); }}
            onFocus={alTocar}
            placeholder="Escribe algo..."
            maxLength={LARGO_MAXIMO}
            autoComplete="off"
            data-tira-entrada
            className="min-w-0 flex-1 rounded-lg border border-domino-accent/25 bg-black/40 px-3 py-2 text-sm text-domino-cream placeholder:text-domino-cream-dim/80 focus:border-domino-accent/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            className="shrink-0 rounded-lg bg-domino-accent px-3 py-2 text-sm font-bold text-domino-dark disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      ) : (
        <p className="mt-1 px-1 text-[11px] font-semibold text-domino-cream-dim">Ponte un nombre en el umbral para escribir.</p>
      )}
    </div>
  );
}
