import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { connectSocket } from '../../services/socket.js';

/**
 * El buzon de avisos: retos que te hacen, torneos, y lo que venga.
 *
 * Los avisos se guardan en la base, no se mandan y ya. Si te retaron mientras
 * no estabas, al volver lo ves: un aviso que solo existe mientras mirabas la
 * pantalla no sirve de nada.
 *
 * Los torneos todavia no existen. El tipo esta previsto para que cuando se
 * hagan solo tengan que escribir una fila.
 */

const ICONO = {
  reto: '⚔️',
  'reto-aceptado': '✅',
  'reto-rechazado': '🚫',
  'reto-vencido': '⌛',
  torneo: '🏆'
};

export default function Campana() {
  const { user } = useAuth();

  const [abierto, setAbierto] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const [sinLeer, setSinLeer] = useState(0);
  const caja = useRef(null);

  const cargar = useCallback(() => {
    const socket = connectSocket();
    if (!socket) return;
    socket.emit('notif:listar', (r) => {
      if (!r?.ok) return;
      setAvisos(r.notificaciones ?? []);
      setSinLeer(r.sinLeer ?? 0);
    });
  }, []);

  useEffect(() => {
    if (!user) { setAvisos([]); setSinLeer(0); return; }

    const socket = connectSocket();
    if (!socket) return;

    const alNuevo = (aviso) => {
      setAvisos((antes) => [aviso, ...antes].slice(0, 30));
      setSinLeer((n) => n + 1);
    };

    socket.on('notif:nueva', alNuevo);
    socket.on('connect', cargar);
    if (socket.connected) cargar();

    return () => {
      socket.off('notif:nueva', alNuevo);
      socket.off('connect', cargar);
    };
  }, [user, cargar]);

  // Se cierra al tocar fuera. Un panel que se queda abierto tapando la pantalla
  // es de las cosas que mas molestan en el telefono.
  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', alTocar);
    document.addEventListener('touchstart', alTocar);
    return () => {
      document.removeEventListener('mousedown', alTocar);
      document.removeEventListener('touchstart', alTocar);
    };
  }, [abierto]);

  const abrir = () => {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente && sinLeer > 0) {
      connectSocket()?.emit('notif:marcar-leidas', () => {});
      setSinLeer(0);
      setAvisos((antes) => antes.map((a) => ({ ...a, leida: true })));
    }
  };

  const cuando = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const minutos = Math.round((Date.now() - d.getTime()) / 60000);
    if (minutos < 1) return 'recién';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  if (!user) return null;

  return (
    <div className="relative" ref={caja}>
      <button
        onClick={abrir}
        aria-label="Avisos"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-domino-accent/30 bg-black/45 text-sm backdrop-blur-sm transition hover:border-domino-accent/70"
      >
        <span aria-hidden="true">🔔</span>
        {sinLeer > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-domino-accent px-1 text-[10px] font-bold text-black">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 max-h-[60svh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-domino-accent/25 bg-black/95 shadow-2xl backdrop-blur-md">
          <div className="border-b border-domino-accent/20 px-4 py-2.5 text-xs font-semibold tracking-widest text-domino-accent">
            AVISOS
          </div>

          {avisos.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs leading-relaxed text-domino-cream/50">
              No tenés avisos todavía. Acá van a llegar los retos que te hagan y los
              torneos cuando estén.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {avisos.map((a) => (
                <li key={a.id} className={`px-4 py-3 ${a.leida ? '' : 'bg-domino-accent/5'}`}>
                  <div className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-0.5 shrink-0">
                      {ICONO[a.tipo] ?? '•'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-domino-cream">
                        {a.titulo}
                      </p>
                      {a.cuerpo && (
                        <p className="mt-0.5 text-xs leading-snug text-domino-cream/60">{a.cuerpo}</p>
                      )}
                      <p className="mt-1 text-[10px] text-domino-cream/35">{cuando(a.creadaEn)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
