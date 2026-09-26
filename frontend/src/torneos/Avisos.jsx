import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Zap, Trophy } from 'lucide-react';
import { torneos, escuchar, EVENTOS, modoDemo, mensajeDeError, rutaDeMesa, miId } from './api.js';
import { dispararAvisoDeMuestra } from './demo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { identidad } from '../umbral/identidad.js';
import { sonar, vibrar, prepararAvisos } from '../utils/soundEffects.js';
import { BODY, SERIF, GRITO, fmtClock } from './utileria.jsx';

/**
 * LOS AVISOS DEL TORNEO QUE TE ALCANZAN EN CUALQUIER PANTALLA, copiados del
 * truco (App.tsx, «tournament:table_ready», «armando», «llegaste_tarde» y la
 * BandaMesaViva):
 *
 *  - TU MESA ESTA LISTA: suena, vibra y TE LLEVA (Raul, 7-ago: «a su mesa lo
 *    llevan, no lo invitan»). Si estas jugando otra partida no se te saca: sale
 *    la tarjeta con «Voy, guardenme el puesto» y «No voy a poder».
 *  - ARRANCA EL RELAMPAGO: el aviso de quedarse, con su cuenta.
 *  - LLEGASTE TARDE: con la puerta abierta, el boton para entrar ya.
 *  - TU MESA TE ESPERA: la banda de arriba mientras tengas una mesa de torneo
 *    en curso y no estes en ella.
 */

/* ------------------------------------------------------------ los toasts */

const oyentes = new Set();
let siguiente = 1;

/** Un aviso corto abajo, encima del dock: `{ tipo, titulo, detalle, accion: { texto, onClick }, duracion }`. */
export function avisar(aviso) {
  const a = { id: siguiente++, tipo: 'info', duracion: 5000, ...aviso };
  oyentes.forEach((fn) => fn(a));
  return a.id;
}

const ICONO = { info: Info, exito: CheckCircle2, error: AlertTriangle, rayo: Zap };
const TONO = {
  info: { borde: 'rgba(216,180,92,0.6)', icono: '#E5C26A' },
  exito: { borde: 'rgba(123,216,168,0.6)', icono: '#7BD8A8' },
  error: { borde: 'rgba(232,136,136,0.65)', icono: '#F0A9A9' },
  rayo: { borde: 'rgba(216,180,92,0.85)', icono: '#F2D479' }
};

function Toasts() {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    const alLlegar = (a) => {
      setLista((l) => [...l.slice(-2), a]);
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== a.id)), a.duracion);
    };
    oyentes.add(alLlegar);
    return () => oyentes.delete(alLlegar);
  }, []);
  if (lista.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[190] flex flex-col items-center gap-2 px-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 82px)' }}>
      {lista.map((a) => {
        const Icono = ICONO[a.tipo] ?? Info;
        const tono = TONO[a.tipo] ?? TONO.info;
        return (
          <div
            key={a.id}
            role="status"
            data-testid="aviso-torneo"
            className="tor-aviso pointer-events-auto flex w-full max-w-[400px] items-start gap-2.5 rounded-2xl px-3.5 py-3"
            style={{ background: 'rgba(10,20,13,0.96)', border: `1.5px solid ${tono.borde}`, boxShadow: '0 10px 28px rgba(0,0,0,0.6)', fontFamily: BODY }}
          >
            <Icono size={19} strokeWidth={2.4} color={tono.icono} className="mt-0.5 flex-none" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold leading-snug text-[#F5F0E8]">{a.titulo}</span>
              {a.detalle && <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-[#F5F0E8]/80">{a.detalle}</span>}
            </span>
            {a.accion && (
              <button
                type="button"
                onClick={() => { setLista((l) => l.filter((x) => x.id !== a.id)); a.accion.onClick(); }}
                className="flex-none self-center rounded-full px-3 py-2 text-[12px] font-black uppercase tracking-[0.04em] text-[#2B2419]"
                style={{ background: 'linear-gradient(180deg, #F1D98A, #C79B37)', boxShadow: '0 3px 8px rgba(0,0,0,0.35)' }}
              >
                {a.accion.texto}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------ el candado de la mesa */

/** Las mesas a las que ya se entro desde aqui: cada mesa nueva entra UNA vez. */
export const mesasYaEntradas = new Set();

/* --------------------------------------------------------- la banda viva */

export function BandaMesaViva({ torneoNombre, hastaMs, onVolver }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const quedan = hastaMs != null ? Math.max(0, Math.ceil((hastaMs - ahora) / 1000)) : null;
  const urgente = quedan != null && quedan <= 15;
  return (
    <div
      role="status"
      data-testid="banda-mesa-viva"
      onClick={onVolver}
      className="fixed inset-x-0 top-0 z-[185] flex cursor-pointer items-center gap-2.5 px-3 pb-2"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
        background: urgente ? 'linear-gradient(180deg, #7A1F1F 0%, #4A0F0F 100%)' : 'linear-gradient(180deg, #2E5E3A 0%, #1B3D26 100%)',
        borderBottom: '2px solid #D8B45C',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        color: '#F5F0E8',
        fontFamily: BODY
      }}
    >
      <Zap size={22} strokeWidth={2.4} fill="#F2D479" color="#8a5a12" className="flex-none" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-black tracking-[0.02em]">Tu mesa te espera</span>
        <span className="block truncate text-[12px] font-semibold opacity-90">{torneoNombre || 'Si no vuelves, pierdes la partida'}</span>
      </span>
      {quedan != null && (
        <span data-testid="banda-mesa-viva-segundos" className="min-w-[34px] text-right text-[22px] font-black tabular-nums" style={{ color: urgente ? '#FF8A8A' : '#F4E2A8' }}>{quedan}</span>
      )}
      <button
        type="button"
        data-testid="button-volver-a-mi-mesa"
        onClick={(e) => { e.stopPropagation(); onVolver(); }}
        className={`${urgente ? 'tor-late ' : ''}whitespace-nowrap rounded-full px-3.5 py-2.5 text-[13px] font-black uppercase tracking-[0.06em] text-[#2B2419]`}
        style={{ background: 'linear-gradient(180deg, #F1D98A, #C79B37)', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }}
      >
        Volver
      </button>
    </div>
  );
}

/* -------------------------------------------- la tarjeta «te toca jugar» */

const rondaDe = (round, total) => {
  if (!round || !total) return null;
  const faltan = total - round;
  return faltan === 0 ? 'la final' : faltan === 1 ? 'la semifinal' : faltan === 2 ? 'los cuartos' : `la ronda ${round}`;
};

function TarjetaTeToca({ aviso, jugando, onIr, onVoy, onNoVoy, onVerLlave }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const esFinal = aviso.round && aviso.totalRondas && aviso.round === aviso.totalRondas;
  const falta = aviso.deadlineAt ? new Date(aviso.deadlineAt).getTime() - ahora : null;
  const ronda = rondaDe(aviso.round, aviso.totalRondas);
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-4" data-testid="vip-torneo">
      <div className="tor-aviso w-full max-w-sm rounded-[22px] border-[1.5px] border-[#C5A028]/80 p-5 text-center shadow-2xl" style={{ background: 'radial-gradient(90% 60% at 50% 0%, #1d3a2b 0%, #10231B 50%, #080d0a 100%)', fontFamily: BODY }}>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'conic-gradient(from 0deg, #F8E3A8, #9A7A2E, #F8E3A8, #9A7A2E, #F8E3A8)', boxShadow: '0 0 28px rgba(229,194,106,0.45)' }}>
          <span className="grid h-[56px] w-[56px] place-items-center rounded-full bg-[#10231B]" style={{ fontFamily: GRITO, fontSize: 24, color: '#F2D479' }}>
            {aviso.quedan ? aviso.quedan : <Trophy size={26} color="#F2D479" aria-hidden />}
          </span>
        </span>
        <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.3em] text-[#C9A46A]">{aviso.nombre}</p>
        <h2 className="mt-1 text-[22px] font-bold leading-tight text-[#F8E3A8]" style={{ fontFamily: SERIF }}>
          {esFinal ? '¡Estás en la final!' : ronda ? `Te toca ${ronda}` : 'Te toca jugar'}
        </h2>
        <p className="mt-1 text-[14px] font-semibold text-[#F5F0E8]/85">
          {aviso.rivalName ? <>Contra <b className="text-[#F2D479]">{aviso.rivalName}</b></> : 'Tu mesa está lista'}
          {aviso.quedan ? ` · quedan ${aviso.quedan} de pie` : ''}
        </p>
        {falta != null && (
          <>
            <p className="mt-4 text-[34px] font-black tabular-nums" style={{ color: esFinal || falta < 30000 ? '#FF6B57' : '#F2D479' }}>{fmtClock(falta)}</p>
            <p className="text-[10.5px] font-bold tracking-[0.2em] text-[#F5F0E8]/60">PARA SENTARTE</p>
          </>
        )}
        <button type="button" onClick={onIr} data-testid="vip-torneo-ir" className="mt-4 w-full rounded-xl py-3.5 text-[15px] font-black tracking-[0.12em] text-[#F6F2E4]" style={{ background: 'linear-gradient(180deg, #2C6B45 0%, #1D5233 100%)', border: '1.5px solid #23553A', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 14px rgba(0,0,0,0.4)' }}>
          {jugando ? 'IR AHORA' : esFinal ? 'IR A LA FINAL' : 'SENTARME'}
        </button>
        <button type="button" onClick={jugando ? onVoy : onVerLlave} data-testid="vip-torneo-secundario" className="mt-2 w-full rounded-xl border border-[#D8B45C]/50 bg-black/30 py-3 text-[13.5px] font-bold text-[#F5F0E8]">
          {jugando ? 'Voy — guárdenme el puesto' : 'Ver la llave'}
        </button>
        {jugando && (
          <button type="button" onClick={onNoVoy} data-testid="vip-torneo-no-voy" className="mt-2 w-full py-2 text-[12.5px] font-semibold text-[#F0A9A9] underline decoration-[#F0A9A9]/40 underline-offset-4">
            No voy a poder
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------- el vigilante de toda la app */

/** La mesa que se esta mirando en esta ruta: `/game?join=CODE` o `/game/CODE`. */
function mesaDeLaRuta(pathname, search) {
  if (!/^\/game(\/|$)/.test(pathname)) return null;
  const join = new URLSearchParams(search).get('join');
  if (join) return join.toUpperCase();
  return ((pathname.match(/^\/game\/([^/?#]+)/) ?? [])[1] ?? '').toUpperCase() || null;
}

export default function AvisosDelTorneo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [teToca, setTeToca] = useState(null);
  const [mesaViva, setMesaViva] = useState(null);
  /** La partida que se esta jugando termino: ahi ya se le puede llevar a la siguiente mesa. */
  const [terminada, setTerminada] = useState(null);
  const demo = modoDemo();
  const conQuien = Boolean(user || identidad() || demo);
  const rutaRef = useRef({ pathname, search });
  rutaRef.current = { pathname, search };

  const enPartida = (ruta) => /^\/game(\/|$)/.test(ruta);

  const entrarAMiMesa = useCallback((a) => {
    mesasYaEntradas.add(String(a.tableId).toUpperCase());
    setTeToca(null);
    navigate(rutaDeMesa(a.tableId));
  }, [navigate]);

  useEffect(() => {
    if (!conQuien) return undefined;
    try { prepararAvisos(); } catch { /* sin audio */ }

    const alTocar = (p) => {
      const aviso = { ...p, tableId: String(p.code ?? p.tableId).toUpperCase(), nombre: p.tournamentName ?? 'Tu torneo' };
      try { sonar('teToca'); } catch { /* audio bloqueado */ }
      try { navigator.vibrate?.([120, 60, 120]); } catch { try { vibrar('teToca'); } catch { /* sin vibracion */ } }
      const { pathname: ruta, search: busca } = rutaRef.current;
      if (mesaDeLaRuta(ruta, busca) === aviso.tableId) return;
      // A SU MESA LO LLEVAN, NO LO INVITAN; pero de una partida empezada no se
      // saca a nadie: ahi sale la tarjeta y, al terminar esa partida, se le lleva.
      if (enPartida(ruta) || modoDemo()) {
        setTeToca(aviso);
        return;
      }
      entrarAMiMesa(aviso);
      avisar({ tipo: 'rayo', titulo: 'Te llevamos a tu mesa', detalle: aviso.rivalName ? `Contra ${aviso.rivalName}. ¡Suerte!` : aviso.nombre });
    };

    const alArmar = (p) => {
      const seg = p.hasta ? Math.max(0, Math.round((new Date(p.hasta).getTime() - Date.now()) / 1000)) : null;
      avisar({
        tipo: 'rayo',
        titulo: p.segunda ? 'Falta gente: último llamado' : 'Arranca el Relámpago: quédate',
        detalle: seg != null ? `En ${seg} s el cuadro se arma con los que estén conectados. Estás dentro: no cierres la app.` : 'El cuadro se arma con los que estén conectados.',
        duracion: 12000,
        accion: { texto: 'Ir al torneo', onClick: () => navigate(`/torneos/${p.tournamentId}`) }
      });
      try { sonar('teToca'); } catch { /* audio bloqueado */ }
    };

    const alLlegarTarde = (p) => {
      if (p.motivo === 'ausente' && p.puertaAbierta) {
        avisar({
          tipo: 'rayo',
          titulo: '¡Todavía puedes entrar!',
          detalle: 'El torneo ya arrancó, pero queda puesto. Tienes unos minutos.',
          duracion: 20000,
          accion: {
            texto: 'Entrar ahora',
            onClick: async () => {
              try {
                const r = await torneos.entrarTarde(p.tournamentId);
                if (r?.ok === false) avisar({ tipo: 'error', titulo: r.error || 'Ya no queda puesto' });
                else avisar({ tipo: 'exito', titulo: '¡Entraste! Tu mesa sale en un momento.' });
              } catch (err) {
                avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo entrar') });
              }
              navigate(`/torneos/${p.tournamentId}`);
            }
          }
        });
        return;
      }
      avisar({
        tipo: 'error',
        titulo: p.motivo === 'sin_cupo' ? 'Se llenó el cuadro' : 'Llegaste tarde',
        detalle: p.motivo === 'sin_cupo' ? 'El torneo arrancó con el cuadro lleno y no alcanzó tu puesto.' : 'El cuadro se armó con los que estaban conectados a la hora.',
        duracion: 12000,
        ...(p.proximoId ? { accion: { texto: 'Anotarme al próximo', onClick: () => navigate(`/torneos/${p.proximoId}`) } } : {})
      });
    };

    const alRecordar = (p) => {
      avisar({
        tipo: 'rayo',
        titulo: p.title || 'Tu torneo arranca pronto',
        detalle: p.body,
        duracion: 10000,
        accion: { texto: 'Ver', onClick: () => navigate(`/torneos/${p.tournamentId}`) }
      });
    };

    const alCerrarMesa = (p) => {
      const { pathname: ruta, search: busca } = rutaRef.current;
      if (mesaDeLaRuta(ruta, busca) !== String(p.code ?? '').toUpperCase()) return;
      avisar({ tipo: 'info', titulo: 'Esta mesa ya no cuenta para el torneo', detalle: 'Mira la llave: ahí sale cómo quedó tu cruce.', duracion: 9000, accion: { texto: 'Ver la llave', onClick: () => navigate(`/torneos/${p.tournamentId}`) } });
    };

    const alPodio = (p) => {
      const yo = String(miId(user));
      const mio = (p.podio ?? []).find((q) => String(q.userId) === yo);
      if (!mio) return;
      avisar({
        tipo: 'exito',
        titulo: mio.puesto === 1 ? '¡Eres el campeón!' : `Quedaste de ${mio.puesto}.º`,
        detalle: `${p.tournamentName} · +${mio.puntos} puntos${mio.puesto === 1 ? ' y la copa' : ''}`,
        duracion: 12000,
        accion: { texto: 'Ver el podio', onClick: () => navigate(`/torneos/${p.tournamentId}`) }
      });
    };

    // La partida que se juega avisa cuando termina: la mesa del torneo siguiente espera esos segundos.
    const alEstadoDeMesa = (s) => {
      if (s?.status === 'game-over' && s.torneo) setTerminada({ code: String(s.roomCode ?? '').toUpperCase(), en: Date.now() });
    };

    const offs = [
      escuchar(EVENTOS.mesaLista, alTocar),
      escuchar(EVENTOS.armando, alArmar),
      escuchar(EVENTOS.llegasteTarde, alLlegarTarde),
      escuchar(EVENTOS.recordatorio, alRecordar),
      escuchar(EVENTOS.mesaCerrada, alCerrarMesa),
      escuchar(EVENTOS.podio, alPodio),
      escuchar('game:state', alEstadoDeMesa)
    ];
    if (modoDemo()) dispararAvisoDeMuestra();
    return () => offs.forEach((off) => off());
  }, [conQuien, entrarAMiMesa, navigate, user]);

  // Con la partida TERMINADA ya no hay nada que interrumpir: se le deja ver el
  // resultado unos segundos y se le lleva a su mesa nueva (truco, App.tsx).
  const mesaActual = mesaDeLaRuta(pathname, search);
  useEffect(() => {
    if (!teToca || modoDemo() || !terminada || terminada.code !== mesaActual) return undefined;
    const t = setTimeout(() => entrarAMiMesa(teToca), Math.max(0, 4000 - (Date.now() - terminada.en)));
    return () => clearTimeout(t);
  }, [teToca, terminada, mesaActual, entrarAMiMesa]);

  // EL RESCATE AL ABRIR: el aviso por socket solo llega si estabas conectado en
  // ese instante. Al abrir y cada rato se pregunta si hay una mesa esperandote.
  useEffect(() => {
    if (!conQuien) return undefined;
    let vivo = true;
    const mirar = async () => {
      try {
        const r = await torneos.miMesa();
        if (vivo) setMesaViva(r?.mesa ?? null);
      } catch {
        if (vivo) setMesaViva(null);
      }
    };
    mirar();
    const id = setInterval(mirar, 15000);
    const alVolver = () => { if (!document.hidden) mirar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { vivo = false; clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [conQuien, pathname]);

  const enSuMesa = mesaViva && mesaActual === String(mesaViva.tableId).toUpperCase();
  const pantallaDelSocio = /^\/(config|guardianes|disputas|buzon|socio-torneos)/.test(pathname);
  const verBanda = mesaViva && !teToca && !enSuMesa && !enPartida(pathname) && !pantallaDelSocio;

  return (
    <>
      {verBanda && (
        <BandaMesaViva
          torneoNombre={mesaViva.torneoNombre}
          hastaMs={mesaViva.hastaMs ?? null}
          onVolver={() => navigate(rutaDeMesa(mesaViva.tableId))}
        />
      )}
      {teToca && (
        <TarjetaTeToca
          aviso={teToca}
          jugando={enPartida(pathname)}
          onIr={() => entrarAMiMesa(teToca)}
          onVerLlave={() => { const id = teToca.tournamentId; setTeToca(null); navigate(`/torneos/${id}`); }}
          onVoy={async () => {
            const id = teToca.tournamentId;
            try {
              const r = await torneos.voy(id);
              avisar({ tipo: 'exito', titulo: r?.prorrogaMinutos > 0 ? `Te guardamos el puesto. Tienes ${r.prorrogaMinutos} minutos más` : 'Te guardamos el puesto' });
            } catch (err) {
              avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo guardar tu puesto') });
            }
          }}
          onNoVoy={async () => {
            if (!window.confirm('¿Cedes tu cruce? Quedas fuera del torneo.')) return;
            const id = teToca.tournamentId;
            setTeToca(null);
            try {
              await torneos.noVoy(id);
              avisar({ tipo: 'exito', titulo: 'Listo, tu rival pasa' });
            } catch (err) {
              avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo ceder el cruce') });
            }
          }}
        />
      )}
      <Toasts />
    </>
  );
}
