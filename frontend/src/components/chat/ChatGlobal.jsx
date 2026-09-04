import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { connectSocket } from '../../services/socket.js';

const LARGO_MAXIMO = 300;

/**
 * El chat del menu principal.
 *
 * Escribe el que tiene cuenta; el invitado lee. La decision es de Jonathan y el
 * motivo es de moderacion: sin cuenta no hay a quien callar cuando alguien se
 * porta mal. Aca solo se APAGA la caja de texto; el permiso de verdad lo decide
 * el servidor, que es lo unico que no se puede tocar desde el navegador.
 *
 * Va cerrado por defecto y se abre con un boton. En el telefono ocupa toda la
 * parte de abajo: si estuviera siempre abierto taparia los botones de jugar,
 * que es a lo que la gente entra.
 */
export default function ChatGlobal() {
  const { user } = useAuth();

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState(null);
  const [sinLeer, setSinLeer] = useState(0);

  const finDeLaLista = useRef(null);
  const abiertoRef = useRef(abierto);
  abiertoRef.current = abierto;

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    const entrar = () => socket.emit('chat:entrar');

    const alHistorial = ({ mensajes: previos }) => setMensajes(previos ?? []);

    const alMensaje = (mensaje) => {
      setMensajes((antes) => [...antes, mensaje]);
      // Se cuenta como sin leer solo si el panel esta cerrado. `abiertoRef`
      // existe por eso: el listener se registra una sola vez y de otro modo se
      // quedaria mirando el valor de `abierto` del primer render.
      if (!abiertoRef.current) setSinLeer((n) => n + 1);
    };

    const alError = ({ mensaje }) => setAviso(mensaje);

    socket.on('chat:historial', alHistorial);
    socket.on('chat:mensaje', alMensaje);
    socket.on('chat:error', alError);
    // Si se corta la conexion y vuelve, hay que volver a entrar al chat: el
    // servidor perdio la sala en la que estaba este socket.
    socket.on('connect', entrar);

    if (socket.connected) entrar();

    return () => {
      socket.off('chat:historial', alHistorial);
      socket.off('chat:mensaje', alMensaje);
      socket.off('chat:error', alError);
      socket.off('connect', entrar);
    };
    // `user` esta en las dependencias porque al iniciar sesion el socket se
    // rehace con el token nuevo y hay que volver a engancharse.
  }, [user]);

  useEffect(() => {
    if (abierto) {
      setSinLeer(0);
      finDeLaLista.current?.scrollIntoView({ block: 'end' });
    }
  }, [abierto, mensajes]);

  // El aviso se va solo: un error que se queda pegado en pantalla es ruido.
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(id);
  }, [aviso]);

  const enviar = (e) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;

    const socket = connectSocket();
    socket?.emit('chat:enviar', { texto: limpio });
    setTexto('');
  };

  const hora = (cuando) => {
    const d = new Date(cuando);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-domino-accent/40 bg-black/70 px-4 py-2 text-xs font-semibold tracking-wider text-domino-cream shadow-lg backdrop-blur-sm transition hover:border-domino-accent hover:bg-black/85 sm:text-sm"
      >
        <span aria-hidden="true">💬</span>
        CHAT
        {sinLeer > 0 && (
          <span className="ml-1 rounded-full bg-domino-accent px-1.5 py-0.5 text-[10px] font-bold text-black">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-[62svh] flex-col border-t border-domino-accent/30 bg-black/90 backdrop-blur-md sm:inset-x-auto sm:bottom-4 sm:left-4 sm:h-[26rem] sm:w-[22rem] sm:rounded-xl sm:border">
      <div className="flex items-center justify-between border-b border-domino-accent/20 px-4 py-2.5">
        <span className="text-xs font-semibold tracking-wider text-domino-accent sm:text-sm">
          CHAT GENERAL
        </span>
        <button
          onClick={() => setAbierto(false)}
          className="px-2 text-lg leading-none text-domino-cream/70 hover:text-domino-cream"
          aria-label="Cerrar el chat"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {mensajes.length === 0 ? (
          <p className="pt-6 text-center text-xs text-domino-cream/50">
            Todavía no dijo nada nadie. Empezá vos.
          </p>
        ) : (
          mensajes.map((m) => (
            <div key={m.id} className="text-sm leading-snug">
              <span
                className={
                  Number(m.userId) === Number(user?.id)
                    ? 'font-semibold text-domino-accent'
                    : 'font-semibold text-domino-cream/90'
                }
              >
                {m.username}
              </span>
              <span className="ml-1.5 text-[10px] text-domino-cream/40">{hora(m.creadoEn)}</span>
              {/* React escapa el texto solo: nadie puede meter HTML por aca. */}
              <p className="break-words text-domino-cream/80">{m.texto}</p>
            </div>
          ))
        )}
        <div ref={finDeLaLista} />
      </div>

      {aviso && (
        <p className="border-t border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs text-red-300">
          {aviso}
        </p>
      )}

      {user ? (
        <form onSubmit={enviar} className="flex items-center gap-2 border-t border-domino-accent/20 p-3">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LARGO_MAXIMO))}
            placeholder="Escribí algo..."
            maxLength={LARGO_MAXIMO}
            className="min-w-0 flex-1 rounded-lg border border-domino-accent/25 bg-black/50 px-3 py-2 text-sm text-domino-cream placeholder:text-domino-cream/35 focus:border-domino-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!texto.trim()}
            className="rounded-lg bg-domino-accent px-3 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      ) : (
        <p className="border-t border-domino-accent/20 p-3 text-center text-xs text-domino-cream/60">
          <Link to="/login" className="font-semibold text-domino-accent hover:underline">
            Iniciá sesión
          </Link>{' '}
          para escribir. Mientras tanto podés leer.
        </p>
      )}
    </div>
  );
}
