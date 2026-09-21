import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, EyeOff, Send, VolumeX, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { haySesion } from '../services/api.js';
import { connectSocket } from '../services/socket.js';
import MesaConSillas from '../antesala/MesaConSillas.jsx';
import SuspenderDelChat from './SuspenderDelChat.jsx';

/**
 * EL SALON (seccion 196): el chat del club y quien esta en linea, copiado
 * del truco (Raul, 20-sep: «copiate del privoytruco»).
 *
 * Las dos cosas viven juntas porque son la misma pregunta: ¿hay gente? Un chat
 * vacio deprime; una lista de conectados al lado le da sentido ("ah, hay seis,
 * y a este lo puedo retar").
 *
 * Es una hoja que sube desde abajo (72 % de la pantalla) con dos pestanas.
 * EL NOMBRE ES LA PUERTA DEL RETO (Raul, truco 2026-08-11): un boton en cada
 * renglon llenaba el chat de botones; tocar el nombre deja la conversacion
 * limpia y el reto a un toque.
 *
 * La moderacion de verdad esta en el servidor (groserias tapadas, enlaces
 * quitados, spam silenciado). Aca solo se muestra lo que llega y se le explica
 * al jugador cuando algo suyo salio distinto.
 */
const LARGO_MAX = 240;
/** Cada cuanto se relee quien esta en linea mientras la hoja esta abierta. */
const REFRESCO_MS = 4000;

const hora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function Salon({ abierto, onCerrar }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const conCuenta = haySesion() && user;

  const [pestana, setPestana] = useState('chat');
  const [mensajes, setMensajes] = useState([]);
  const [gente, setGente] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [miSilencio, setMiSilencio] = useState(null);
  const [soySocio, setSoySocio] = useState(false);
  /** A quien estoy por retar. */
  const [retando, setRetando] = useState(null);
  /** El socio esta suspendiendo a alguien (la hoja de dias + mensaje). */
  const [suspendiendo, setSuspendiendo] = useState(null);
  const finRef = useRef(null);

  const miId = conCuenta ? Number(user.id) : null;

  // Se escucha el chat SIEMPRE que la hoja exista (aunque este cerrada), para
  // que al abrirla ya este cargada y para contar lo nuevo.
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    const entrar = () => socket.emit('chat:entrar');
    const alHistorial = (h) => {
      setMensajes(h?.mensajes ?? []);
      setMiSilencio(h?.miSilencio ?? null);
      setSoySocio(Boolean(h?.soySocio));
    };
    const alMensaje = (m) => setMensajes((antes) => [...antes, m]);
    const alOculto = ({ id }) => setMensajes((antes) => antes.filter((m) => Number(m.id) !== Number(id)));
    const alSilenciado = (s) => setMiSilencio(s ?? null);

    socket.on('chat:historial', alHistorial);
    socket.on('chat:mensaje', alMensaje);
    socket.on('chat:oculto', alOculto);
    socket.on('chat:silenciado', alSilenciado);
    socket.on('connect', entrar);
    if (socket.connected) entrar();

    return () => {
      socket.off('chat:historial', alHistorial);
      socket.off('chat:mensaje', alMensaje);
      socket.off('chat:oculto', alOculto);
      socket.off('chat:silenciado', alSilenciado);
      socket.off('connect', entrar);
    };
  }, [user]);

  const cargarGente = useCallback(() => {
    connectSocket()?.emit('salon:gente', (r) => { if (r?.ok) setGente(r.gente ?? []); });
  }, []);

  useEffect(() => {
    if (!abierto) return undefined;
    cargarGente();
    const id = window.setInterval(cargarGente, REFRESCO_MS);
    return () => window.clearInterval(id);
  }, [abierto, cargarGente]);

  useEffect(() => {
    if (abierto && pestana === 'chat') finRef.current?.scrollIntoView({ block: 'end' });
  }, [abierto, mensajes.length, pestana]);

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(id);
  }, [aviso]);

  const enviar = () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    connectSocket()?.emit('chat:enviar', { texto: t }, (r) => {
      setEnviando(false);
      if (!r?.ok) {
        setAviso(r?.error || 'No se pudo enviar');
        if (r?.code === 'silenciado' && r.hasta) setMiSilencio({ hasta: r.hasta, mensaje: null });
        return;
      }
      setTexto('');
      if (r.seQuitoContacto) setAviso('Quitamos un enlace de tu mensaje. Acá no se comparten links ni teléfonos.');
    });
  };

  const retar = () => {
    const rival = retando;
    if (!rival) return;
    setRetando(null);
    connectSocket()?.emit('reto:enviar', { paraId: rival.id, paraNombre: rival.username }, (r) => {
      setAviso(r?.ok ? `Reto enviado a ${rival.username}. Tiene un minuto.` : (r?.error || 'No se pudo enviar el reto'));
    });
  };

  const ocultar = (id) => connectSocket()?.emit('salon:ocultar', { mensajeId: id }, (r) => { if (!r?.ok) setAviso(r?.error || 'No se pudo ocultar'); });
  const callar = (m) => connectSocket()?.emit('salon:silenciar', { userId: m.userId, minutos: 10 }, (r) => {
    setAviso(r?.ok ? `${m.username} en silencio por 10 minutos` : (r?.error || 'No se pudo silenciar'));
  });

  /** Un invitado no reta: su identidad es gratis de fabricar. Y a un invitado no se le puede retar. */
  const puedoRetar = Boolean(conCuenta);
  const retable = (id, esInvitado) => puedoRetar && !esInvitado && Number(id) !== miId;

  if (!abierto) return null;

  return (
    <>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="fixed inset-0 z-[60] bg-black/50" />
      <div
        data-salon
        className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[72vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-b-0 border-domino-accent/35 text-domino-cream shadow-[0_-12px_40px_rgba(0,0,0,0.55)]"
        style={{ background: 'linear-gradient(180deg, rgba(12,19,14,0.97) 0%, rgba(8,13,10,0.99) 100%)' }}
      >
        <div className="flex items-center gap-2 border-b border-domino-accent/20 px-3 py-2">
          {['chat', 'gente'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPestana(p)}
              data-pestana={p}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${pestana === p ? 'border-domino-accent/40 bg-domino-accent/15 text-domino-accent' : 'border-transparent text-domino-cream/50'}`}
            >
              {p === 'chat' ? 'Chat' : `En línea (${gente.length})`}
            </button>
          ))}
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-domino-cream/20 text-domino-cream/60">
            <X size={15} />
          </button>
        </div>

        {pestana === 'chat' ? (
          <>
            <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2">
              {mensajes.length === 0 ? (
                <p className="py-6 text-center text-[13px] font-medium text-domino-cream/40">Todavía no hay nada. Saluda tú primero.</p>
              ) : mensajes.map((m) => {
                const mio = Number(m.userId) === miId;
                const puede = !mio && puedoRetar;
                return (
                  <div key={m.id} className="flex items-start gap-2" data-mensaje={m.id}>
                    <button
                      type="button"
                      disabled={!puede}
                      onClick={() => puede && setRetando({ id: m.userId, username: m.username })}
                      title={puede ? `Retar a ${m.username}` : undefined}
                      className={`shrink-0 whitespace-nowrap text-[12px] font-bold ${mio ? 'text-domino-accent' : 'text-[#8FBF9F]'} ${puede ? 'underline decoration-[#8FBF9F]/35 underline-offset-2' : ''}`}
                    >
                      {mio ? 'Tú' : m.username}
                    </button>
                    <span className="flex-1 break-words text-[13px] font-medium">{m.texto}</span>
                    <span className="whitespace-nowrap text-[10px] font-medium text-domino-cream/25">{hora(m.creadoEn)}</span>
                    {soySocio && !mio && (
                      <span className="flex shrink-0 gap-1.5 text-domino-cream/40">
                        <button type="button" onClick={() => ocultar(m.id)} title="Bajar el mensaje" aria-label="Bajar el mensaje"><EyeOff size={13} /></button>
                        <button type="button" onClick={() => callar(m)} title="Silenciar 10 min" aria-label="Silenciar 10 min"><VolumeX size={13} /></button>
                        <button type="button" onClick={() => setSuspendiendo({ userId: m.userId, username: m.username })} title="Suspender del chat" aria-label="Suspender del chat"><Ban size={13} /></button>
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={finRef} />
            </div>

            <div className="border-t border-domino-accent/20 px-3 py-2">
              {aviso && <p className="mb-1.5 text-[12px] font-semibold text-domino-accent" data-aviso>{aviso}</p>}
              {miSilencio ? (
                <p className="text-[12.5px] font-semibold leading-snug text-[#F0A090]" data-suspendido>
                  Tu chat está suspendido hasta el {new Date(miSilencio.hasta).toLocaleDateString('es-VE', { day: 'numeric', month: 'long' })}.
                  {miSilencio.mensaje ? ` ${miSilencio.mensaje}` : ''} Puedes leer, pero no escribir.
                </p>
              ) : !conCuenta ? (
                <div className="flex items-center justify-between gap-2.5">
                  <p className="text-[12px] font-medium text-domino-cream/60" data-invitado>Estás de invitado: puedes leer. Para escribir, crea tu cuenta.</p>
                  <button type="button" onClick={() => { onCerrar(); navigate('/register'); }} className="whitespace-nowrap rounded-full bg-domino-accent px-3 py-2 text-xs font-bold text-domino-dark">
                    Crear mi cuenta
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
                    maxLength={LARGO_MAX}
                    placeholder="Escribe algo…"
                    data-entrada
                    className="flex-1 rounded-full border border-domino-accent/25 bg-black/35 px-3 py-2 text-[13px] font-medium text-domino-cream outline-none placeholder:text-domino-cream/35"
                  />
                  <button
                    type="button"
                    onClick={enviar}
                    disabled={enviando || !texto.trim()}
                    aria-label="Enviar"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-domino-dark disabled:opacity-40"
                    style={{ background: 'linear-gradient(180deg, #F4E2A8 0%, #C5A028 58%, #9A7B1C 100%)' }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2">
            {aviso && <p className="text-[12px] font-semibold text-domino-accent" data-aviso>{aviso}</p>}
            {gente.length === 0 ? (
              <p className="py-6 text-center text-[13px] font-medium text-domino-cream/40">No hay nadie más conectado ahora.</p>
            ) : gente.map((j) => {
              const yo = Number(j.id) === miId;
              return (
                <div key={j.id} className="flex items-center gap-2 rounded-lg border border-domino-accent/15 bg-white/[0.04] px-2.5 py-1.5" data-en-linea={j.username}>
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: j.jugando ? '#D9A441' : '#3ddc84' }} aria-hidden />
                  <MesaConSillas.Retrato avatar={j.retrato || j.username} tamano={26} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {j.username}{yo && <span className="ml-1.5 text-[10px] font-semibold opacity-60">tú</span>}
                    {j.esInvitado && !yo && <span className="ml-1.5 text-[10px] font-semibold opacity-50">de visita</span>}
                  </span>
                  {j.jugando ? (
                    <span className="text-[11px] font-semibold text-[#D9A441]">jugando</span>
                  ) : retable(j.id, j.esInvitado) ? (
                    <button type="button" onClick={() => setRetando({ id: j.id, username: j.username })} className="rounded-full border border-domino-accent/40 bg-domino-accent/10 px-3 py-1 text-xs font-bold text-domino-accent">
                      Retar
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Primero el formato, como en el truco. Aqui el reto es mano a mano y gratis. */}
      {retando && (
        <div role="dialog" aria-label="Retar" className="fixed inset-0 z-[80] flex items-end justify-center">
          <button type="button" aria-label="Cerrar" onClick={() => setRetando(null)} className="absolute inset-0 bg-black/55" />
          <div className="relative w-full max-w-md rounded-t-2xl bg-[#FFFDF7] p-3 pb-[max(16px,env(safe-area-inset-bottom))] text-[#2B2419] shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
            <p className="mb-2.5 text-[15px] font-extrabold">Retar a {retando.username}</p>
            <button type="button" onClick={retar} data-retar-1v1 className="w-full rounded-2xl border-[1.5px] border-[#B9922F] bg-domino-accent px-3.5 py-3 text-left text-sm font-extrabold">
              Mano a mano · 1 vs 1
              <span className="block text-xs font-semibold text-[#5C5142]">Gratis. Si acepta, arrancan al instante.</span>
            </button>
            <button type="button" onClick={() => setRetando(null)} className="mx-auto mt-2.5 block text-[13px] font-bold text-[#7A5A16]">Cancelar</button>
          </div>
        </div>
      )}

      {suspendiendo && (
        <SuspenderDelChat
          userId={suspendiendo.userId}
          username={suspendiendo.username}
          onCerrar={() => setSuspendiendo(null)}
          onListo={(msj) => { setSuspendiendo(null); setAviso(msj); }}
        />
      )}
    </>
  );
}
