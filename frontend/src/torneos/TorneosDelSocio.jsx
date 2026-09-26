import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Plus, Zap } from 'lucide-react';
import { Marco, llaveDelSocio } from '../socio/CuartoDelSocio.jsx';
import { torneosDelSocio } from './api.js';

/**
 * LOS TORNEOS, EN EL CUARTO DEL SOCIO: la tarjeta del Relampago (copia del
 * `PanelRelampago` del truco, sin nada de plata), el formulario de crear un
 * torneo y la lista con sus mandos en caliente (cancelar, rellenar con bots,
 * dar el cruce por ganado o relanzar la mesa).
 *
 * Reglas de la casa: toda perilla con su boton Guardar; nada se guarda solo.
 * El Relampago solo corre cuando el socio lo prende.
 */

const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
const PUNTOS = [24, 50, 100, 150, 200];
const CADA = [[15, 'Cada 15 min'], [20, 'Cada 20 min'], [30, 'Cada 30 min'], [45, 'Cada 45 min'], [60, 'Cada hora'], [90, 'Cada hora y media'], [120, 'Cada 2 horas']];
const ANTICIPACION = [[1, '1 hora de adelanto'], [6, '6 horas de adelanto'], [24, '1 día de adelanto'], [48, '2 días de adelanto'], [72, '3 días de adelanto'], [168, '1 semana de adelanto']];

const campo = 'w-full rounded-lg border border-domino-accent/40 bg-black/50 px-2.5 py-2 text-[14px] font-bold text-domino-cream outline-none [color-scheme:dark]';
const etiqueta = 'mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-domino-cream/70';

const horaVE = (iso) => new Date(iso).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
const fechaVE = (iso) => new Date(iso).toLocaleString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const ESTADO = { registration: 'Inscripción', live: 'En juego', completed: 'Terminado', cancelled: 'Cancelado' };

function Aviso({ texto }) {
  if (!texto) return null;
  return <p className="mb-3 rounded-lg border border-domino-accent/40 bg-domino-accent/10 px-3 py-2 text-[12.5px] font-bold text-domino-accent">{texto}</p>;
}

function Premios({ valor, onCambiar }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {['1.º', '2.º', '3.º'].map((rot, i) => (
        <label key={rot}>
          <span className={etiqueta}>{rot} (pts)</span>
          <input
            inputMode="numeric"
            className={`${campo} text-center`}
            value={valor[i] ?? ''}
            onChange={(e) => {
              const n = [...valor];
              while (n.length < 3) n.push(0);
              n[i] = e.target.value.replace(/[^\d]/g, '');
              onCambiar(n);
            }}
          />
        </label>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- el Relampago */

function PanelRelampago({ api, onAviso }) {
  const [estado, setEstado] = useState(null);
  const [fallo, setFallo] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [borrador, setBorrador] = useState({});

  const cargar = useCallback(() => api.relampago().then((r) => { setEstado(r); setFallo(null); }).catch((e) => setFallo(e.message)), [api]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (cambios) => {
    setBusy(true);
    try {
      setEstado(await api.guardarRelampago(cambios));
      setBorrador({});
      onAviso(cambios.on === undefined ? 'El Relámpago: ajustes guardados.' : cambios.on ? 'El Relámpago está prendido.' : 'El Relámpago está apagado.');
    } catch (e) {
      onAviso(e.message || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  if (fallo) {
    return (
      <section className="mb-5 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-3" data-testid="panel-relampago-fallo">
        <p className="flex items-center gap-1.5 text-[14px] font-extrabold text-red-200"><Zap size={15} aria-hidden /> El Relámpago — no se pudo cargar</p>
        <p className="mt-1 text-[12px] font-medium text-domino-cream/80">{fallo}</p>
      </section>
    );
  }
  if (!estado) return <p className="mb-5 rounded-xl border border-domino-accent/25 bg-black/30 px-3 py-3 text-[13px] font-bold text-domino-cream/70">El Relámpago — cargando…</p>;

  const cfg = estado.config;
  const v = (k) => borrador[k] ?? cfg[k];
  const pon = (k, valor) => setBorrador((b) => ({ ...b, [k]: valor }));
  const hayCambios = Object.keys(borrador).length > 0;

  return (
    <section className={`mb-5 rounded-xl border px-3 py-3 ${cfg.on ? 'border-emerald-400/45 bg-emerald-900/15' : 'border-domino-accent/25 bg-black/30'}`} data-testid="panel-relampago">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[16px] font-bold text-domino-accent" style={{ fontFamily: SERIF }}>
          <Zap size={17} fill="#D8B45C" aria-hidden /> El Relámpago
        </p>
        <span data-testid="relampago-estado" className={`rounded-full px-2.5 py-1 text-[10.5px] font-black tracking-[0.12em] ${cfg.on ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-domino-cream/60'}`}>
          {cfg.on ? 'PRENDIDO' : 'APAGADO'}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] font-semibold leading-snug text-domino-cream/80">
        Gratis, 1 contra 1, a {cfg.targetPoints} puntos y una sola partida. Se rellena con la casa hasta {cfg.cuadroMinimo}. Premio: la copa y {(cfg.premiosPuntos ?? []).join(' / ')} pts; el 3.º se juega junto a la final.
      </p>
      <p className="mt-1 text-[12px] font-semibold text-domino-cream/70">
        {v('desdeHora')} a {v('hastaHora')} · cada {v('cadaMinutos')} min · próximo <b className="text-domino-cream">{estado.proximaFranja ? horaVE(estado.proximaFranja) : 'fuera de horario'}</b>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => guardar({ on: !cfg.on })}
          disabled={busy}
          data-testid="button-relampago-toggle"
          className={`rounded-xl px-4 py-2.5 text-[13px] font-black tracking-[0.06em] disabled:opacity-50 ${cfg.on ? 'border border-red-400/50 bg-red-500/15 text-red-200' : 'bg-gradient-to-b from-emerald-300 to-emerald-600 text-[#0A2416]'}`}
        >
          {busy ? '…' : cfg.on ? 'Apagar el Relámpago' : 'Prender el Relámpago'}
        </button>
        <button type="button" onClick={() => setAbierto((o) => !o)} className="flex items-center gap-1 rounded-xl border border-domino-accent/35 bg-black/40 px-3 py-2.5 text-[12.5px] font-bold text-domino-cream/85" aria-expanded={abierto}>
          Ajustes <ChevronDown size={14} className="transition-transform" style={{ transform: abierto ? 'rotate(180deg)' : 'none' }} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-[11px] font-medium leading-snug text-domino-cream/60">Apagarlo deja de publicar torneos nuevos; los que ya están publicados se juegan igual.</p>

      {abierto && (
        <div className="mt-3 grid grid-cols-2 gap-2.5" data-testid="relampago-ajustes">
          <label><span className={etiqueta}>Desde (hora VE)</span><input type="time" step={300} className={campo} value={v('desdeHora')} onChange={(e) => pon('desdeHora', e.target.value)} data-testid="relampago-desde" /></label>
          <label><span className={etiqueta}>Hasta (hora VE)</span><input type="time" step={300} className={campo} value={v('hastaHora')} onChange={(e) => pon('hastaHora', e.target.value)} data-testid="relampago-hasta" /></label>
          <label className="col-span-2">
            <span className={etiqueta}>Cada cuánto arranca uno</span>
            <select className={campo} value={String(v('cadaMinutos'))} onChange={(e) => pon('cadaMinutos', Number(e.target.value))}>
              {CADA.map(([n, t]) => <option key={n} value={n}>{t}</option>)}
            </select>
          </label>
          <label className="col-span-2">
            <span className={etiqueta}>Se puede anotar con</span>
            <select className={campo} value={String(v('anticipacionHoras'))} onChange={(e) => pon('anticipacionHoras', Number(e.target.value))}>
              {ANTICIPACION.map(([n, t]) => <option key={n} value={n}>{t}</option>)}
            </select>
          </label>
          <label><span className={etiqueta}>Temporada desde</span><input type="date" className={campo} value={v('desdeFecha') ?? ''} onChange={(e) => pon('desdeFecha', e.target.value || null)} /></label>
          <label><span className={etiqueta}>Temporada hasta</span><input type="date" className={campo} value={v('hastaFecha') ?? ''} onChange={(e) => pon('hastaFecha', e.target.value || null)} /></label>
          <label>
            <span className={etiqueta}>Puntos por partida</span>
            <select className={campo} value={String(v('targetPoints'))} onChange={(e) => pon('targetPoints', Number(e.target.value))}>
              {PUNTOS.map((n) => <option key={n} value={n}>A {n}</option>)}
            </select>
          </label>
          <label>
            <span className={etiqueta}>Cuadro mínimo</span>
            <select className={campo} value={String(v('cuadroMinimo'))} onChange={(e) => pon('cuadroMinimo', Number(e.target.value))}>
              {[4, 8, 16, 32].map((n) => <option key={n} value={n}>Rellena hasta {n}</option>)}
            </select>
          </label>
          <div className="col-span-2">
            <span className={etiqueta}>Puntos de la clasificación por puesto</span>
            <Premios valor={v('premiosPuntos') ?? []} onCambiar={(n) => pon('premiosPuntos', n)} />
          </div>
          <button
            type="button"
            onClick={() => guardar({ ...borrador, ...(borrador.premiosPuntos ? { premiosPuntos: borrador.premiosPuntos.map((x) => Number(x) || 0) } : {}) })}
            disabled={busy || !hayCambios}
            className="btn-primary col-span-2 py-2.5 text-[12px] tracking-[0.15em] disabled:opacity-40"
          >
            {busy ? 'GUARDANDO…' : 'GUARDAR AJUSTES'}
          </button>
        </div>
      )}

      {estado.publicados?.length > 0 && (
        <div className="mt-3" data-testid="relampago-publicados">
          <span className={etiqueta}>Publicados sin arrancar ({estado.publicados.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {estado.publicados.slice(0, 10).map((t) => (
              <span key={t.id} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-domino-cream/80">{horaVE(t.startAt)}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------- crear torneo */

const enUnaHora = () => {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function CrearTorneo({ api, onCreado, onAviso }) {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ name: '', start: enUnaHora(), targetPoints: 24, capacity: 16, botFill: true, cuadroMinimo: 8, premios: ['100', '50', '25'] });
  const [busy, setBusy] = useState(false);
  const pon = (k, valor) => setF((x) => ({ ...x, [k]: valor }));

  const crear = async () => {
    if (!f.name.trim()) { onAviso('Ponle un nombre al torneo.'); return; }
    if (!f.start) { onAviso('Elige la fecha y la hora de inicio.'); return; }
    setBusy(true);
    try {
      await api.crear({
        name: f.name.trim(),
        startAt: new Date(f.start).toISOString(),
        targetPoints: f.targetPoints,
        capacity: f.capacity,
        gameFormat: '1v1',
        seriesFormat: 'single',
        botFill: f.botFill,
        cuadroMinimo: f.botFill ? f.cuadroMinimo : null,
        premiosPuntos: f.premios.map((x) => Number(x) || 0)
      });
      onAviso(`«${f.name.trim()}» creado. Ya sale en la vitrina.`);
      setF((x) => ({ ...x, name: '' }));
      setAbierto(false);
      onCreado();
    } catch (e) {
      onAviso(e.message || 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} data-testid="button-toggle-create-tournament" className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-domino-accent/50 bg-black/35 py-3 text-[13px] font-black tracking-[0.12em] text-domino-accent">
        <Plus size={16} strokeWidth={2.6} aria-hidden /> CREAR TORNEO
      </button>
    );
  }

  return (
    <section className="mb-5 rounded-xl border border-domino-accent/40 bg-black/35 px-3 py-3" data-testid="crear-torneo">
      <p className="mb-2.5 text-[16px] font-bold text-domino-accent" style={{ fontFamily: SERIF }}>Crear torneo</p>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="col-span-2"><span className={etiqueta}>Nombre</span><input className={campo} value={f.name} placeholder="Copa del Sábado" onChange={(e) => pon('name', e.target.value)} data-testid="input-tournament-name" /></label>
        <label className="col-span-2"><span className={etiqueta}>Inicio</span><input type="datetime-local" className={campo} value={f.start} onChange={(e) => pon('start', e.target.value)} data-testid="input-tournament-start" /></label>
        <label>
          <span className={etiqueta}>Puntos por partida</span>
          <select className={campo} value={String(f.targetPoints)} onChange={(e) => pon('targetPoints', Number(e.target.value))} data-testid="select-tournament-points">
            {PUNTOS.map((n) => <option key={n} value={n}>A {n}</option>)}
          </select>
        </label>
        <label>
          <span className={etiqueta}>Cupo</span>
          <select className={campo} value={String(f.capacity)} onChange={(e) => pon('capacity', Number(e.target.value))} data-testid="select-tournament-capacity">
            {[4, 8, 16, 32, 64].map((n) => <option key={n} value={n}>{n} jugadores</option>)}
          </select>
        </label>
        <label className="col-span-2 flex items-start gap-2.5 rounded-lg border border-domino-accent/25 bg-black/30 px-3 py-2.5">
          <input type="checkbox" checked={f.botFill} onChange={(e) => pon('botFill', e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-[#C5A028]" data-testid="checkbox-bot-fill" />
          <span>
            <span className="block text-[13px] font-bold">Rellenar los puestos vacíos con bots</span>
            <span className="block text-[11.5px] font-medium text-domino-cream/65">Para que el torneo siempre arranque a la hora</span>
          </span>
        </label>
        {f.botFill && (
          <label className="col-span-2">
            <span className={etiqueta}>Cuadro mínimo</span>
            <select className={campo} value={String(f.cuadroMinimo)} onChange={(e) => pon('cuadroMinimo', Number(e.target.value))}>
              {[4, 8, 16, 32].filter((n) => n <= f.capacity).map((n) => <option key={n} value={n}>{n} jugadores</option>)}
            </select>
          </label>
        )}
        <div className="col-span-2">
          <span className={etiqueta}>Puntos de la clasificación por puesto (y la copa al campeón)</span>
          <Premios valor={f.premios} onCambiar={(n) => pon('premios', n)} />
        </div>
        <button type="button" onClick={crear} disabled={busy} data-testid="button-create-tournament" className="btn-primary col-span-2 py-3 text-[12.5px] tracking-[0.15em] disabled:opacity-50">
          {busy ? 'CREANDO…' : 'CREAR TORNEO'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="col-span-2 py-1.5 text-[12px] font-bold text-domino-cream/60">Cerrar</button>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- la lista */

function Cruces({ api, torneo, onAviso }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const cargar = useCallback(() => api.detalle(torneo.id).then(setD).catch((e) => onAviso(e.message)), [api, torneo.id, onAviso]);
  useEffect(() => { cargar(); }, [cargar]);
  if (!d) return <p className="mt-2 text-[12px] font-semibold text-domino-cream/60">Cargando los cruces…</p>;
  const nombre = (uid) => d.players.find((p) => p.userId === uid)?.displayName ?? '—';
  const abiertos = d.bracket.filter((m) => !m.winnerUserId && m.playerAUserId && m.playerBUserId);
  if (abiertos.length === 0) return <p className="mt-2 text-[12px] font-semibold text-domino-cream/60">No hay cruces por resolver ahora.</p>;
  const hacer = async (fn, texto) => {
    setBusy(true);
    try { await fn(); onAviso(texto); cargar(); } catch (e) { onAviso(e.message || 'No se pudo'); } finally { setBusy(false); }
  };
  return (
    <ul className="mt-2 space-y-2">
      {abiertos.map((m) => (
        <li key={m.id} className="rounded-lg border border-domino-accent/20 bg-black/35 px-2.5 py-2">
          <p className="text-[12.5px] font-extrabold">{nombre(m.playerAUserId)} <span className="text-domino-cream/50">vs</span> {nombre(m.playerBUserId)}</p>
          <p className="text-[10.5px] font-semibold text-domino-cream/55">Ronda {m.round}{m.tercerPuesto ? ' · por el 3.º' : ''} · {m.status === 'playing' ? 'en juego' : 'por presentarse'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[m.playerAUserId, m.playerBUserId].map((uid) => (
              <button key={uid} type="button" disabled={busy} onClick={() => window.confirm(`¿Dar el cruce por ganado a ${nombre(uid)} (walkover)?`) && hacer(() => api.walkover(torneo.id, m.id, uid), `Avanza ${nombre(uid)}`)} className="rounded-full border border-domino-accent/40 px-2.5 py-1 text-[11px] font-bold text-domino-accent disabled:opacity-50">
                Pasa {nombre(uid)}
              </button>
            ))}
            <button type="button" disabled={busy} onClick={() => hacer(() => api.relanzar(torneo.id, m.id), 'Mesa relanzada (plazo renovado)')} className="rounded-full border border-domino-cream/30 px-2.5 py-1 text-[11px] font-bold text-domino-cream/85 disabled:opacity-50">
              Relanzar mesa
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Lista({ api, recarga, onAviso }) {
  const [lista, setLista] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [busy, setBusy] = useState(false);
  const cargar = useCallback(() => api.lista().then((r) => setLista(r.tournaments ?? [])).catch((e) => onAviso(e.message)), [api, onAviso]);
  useEffect(() => { cargar(); }, [cargar, recarga]);

  const hacer = async (fn, texto) => {
    setBusy(true);
    try { await fn(); onAviso(texto); cargar(); } catch (e) { onAviso(e.message || 'No se pudo'); } finally { setBusy(false); }
  };

  if (!lista) return <p className="text-[13px] font-semibold text-domino-cream/60">Cargando los torneos…</p>;
  const vivos = lista.filter((t) => t.status === 'registration' || t.status === 'live');
  return (
    <section data-testid="lista-torneos-socio">
      <h2 className="mb-2 text-[10px] font-extrabold tracking-[0.25em] text-domino-accent">TORNEOS PUBLICADOS</h2>
      {vivos.length === 0 && <p className="rounded-xl border border-domino-accent/20 bg-black/30 px-3 py-3 text-[13px] font-semibold text-domino-cream/70">Ninguno publicado ahora.</p>}
      <ul>
        {vivos.map((t) => (
          <li key={t.id} className="mb-2 rounded-xl border border-domino-accent/25 bg-black/30 px-3 py-2.5" data-torneo={t.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-extrabold">{t.esRelampago && <Zap size={12} className="mr-1 inline" fill="#D8B45C" color="#D8B45C" aria-hidden />}{t.name}</p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-domino-cream/65">{fechaVE(t.startAt)} · a {t.targetPoints} · {t.registeredCount}/{t.capacity}{t.conBots ? ' · con bots' : ''}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.1em] ${t.status === 'live' ? 'bg-[#A8452C]/30 text-[#F0A9A9]' : 'bg-emerald-400/15 text-emerald-300'}`}>{(ESTADO[t.status] ?? t.status).toUpperCase()}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.status === 'registration' && t.registeredCount < t.capacity && (
                <button type="button" disabled={busy} onClick={() => hacer(() => api.rellenarConBots(t.id), `«${t.name}»: rellenado con bots.`)} className="rounded-full border border-domino-accent/40 px-3 py-1.5 text-[11.5px] font-bold text-domino-accent disabled:opacity-50">
                  Rellenar con bots
                </button>
              )}
              {t.status === 'live' && (
                <button type="button" onClick={() => setAbierto(abierto === t.id ? null : t.id)} className="rounded-full border border-domino-cream/30 px-3 py-1.5 text-[11.5px] font-bold text-domino-cream/85">
                  {abierto === t.id ? 'Ocultar cruces' : 'Ver cruces'}
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => window.confirm(`¿Cancelar «${t.name}»? A los anotados se les avisa.`) && hacer(() => api.cancelar(t.id), `«${t.name}» cancelado.`)} className="rounded-full border border-red-400/45 px-3 py-1.5 text-[11.5px] font-bold text-red-200 disabled:opacity-50">
                Cancelar
              </button>
            </div>
            {abierto === t.id && <Cruces api={api} torneo={t} onAviso={onAviso} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TorneosDelSocio() {
  const [llave] = useState(llaveDelSocio);
  const [api] = useState(() => torneosDelSocio(llave));
  const [aviso, setAviso] = useState(null);
  const [recarga, setRecarga] = useState(0);
  return (
    <Marco titulo="Los torneos" llave={llave}>
      <Aviso texto={aviso} />
      <PanelRelampago api={api} onAviso={setAviso} />
      <CrearTorneo api={api} onAviso={setAviso} onCreado={() => setRecarga((n) => n + 1)} />
      <Lista api={api} recarga={recarga} onAviso={setAviso} />
    </Marco>
  );
}
