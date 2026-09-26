import { useEffect, useMemo, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { torneos, mensajeDeError } from './api.js';
import { avisar } from './Avisos.jsx';
import { GRITO, PUESTO } from './utileria.jsx';

/**
 * EL RELOJ DEL TORNEO — el gancho de la portada, copia del truco
 * (`RelojDelTorneo.tsx`, cuarta pasada, 19-sep): LA ETIQUETA COLGANTE, de la
 * familia de las losas de la puerta. Cuerda, ojal, lacre con el rayo, el
 * tiempo en rojo (quieto), ¡GRATIS! en verde, los tres premios con su medalla
 * y ¡LLEGATE!, que inscribe de un toque. Detras cae un rayo cada tanto.
 *
 * Sale solo con alguien en la puerta (cuenta o nombre de invitado), con un
 * torneo publicado y si NO esta anotado; al anotarse se va. La equis cierra el
 * aviso DE ESE torneo y deja pasar al siguiente.
 */

const MEDALLA = [
  'radial-gradient(circle at 35% 30%, #FFF1C2, #E2BE68 55%, #9A7A2E)',
  'radial-gradient(circle at 35% 30%, #ffffff, #d7dbe0 55%, #8f96a0)',
  'radial-gradient(circle at 35% 30%, #f2c9a0, #d29a63 55%, #8a5325)'
];

function elegirTorneo(lista, cerrados) {
  return lista
    .filter((t) => t.status === 'registration' && !t.anotado && !cerrados.includes(t.id))
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0] ?? null;
}

/** «HOY 8:00 P. M.», o con su dia si no es hoy. */
function horaDelTorneo(iso) {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' }).toUpperCase();
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return `HOY ${hora}`;
  return `${d.toLocaleDateString('es-VE', { weekday: 'short' }).toUpperCase()} ${hora}`;
}

function cuentaCorta(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 0,76 en un telefono normal (844 de alto), 1,0 en una pantalla alta (1240). */
const escalaPorAlto = (alto) => Math.min(1, Math.max(0.76, 0.76 + ((alto - 844) / (1240 - 844)) * 0.24));

export default function RelojDelTorneo({ onIrATorneos, abajo = 'calc(150px + var(--tarjeta-instalar, 0px))', alMostrarse }) {
  const [escala, setEscala] = useState(() => escalaPorAlto(typeof window !== 'undefined' ? window.innerHeight : 844));
  const [lista, setLista] = useState(undefined);
  const [yaMeAnote, setYaMeAnote] = useState(false);
  const [anotando, setAnotando] = useState(false);
  const [cerrados, setCerrados] = useState(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('reloj-torneo-cerrados') || '[]');
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const f = () => setEscala(escalaPorAlto(window.innerHeight));
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const r = await torneos.lista();
        if (!cancelado) setLista(r);
      } catch {
        if (!cancelado) setLista([]);
      }
    };
    cargar();
    const t = setInterval(cargar, 60000);
    return () => { cancelado = true; clearInterval(t); };
  }, []);

  const torneo = useMemo(() => (lista ? elegirTorneo(lista, cerrados) : undefined), [lista, cerrados]);
  const arrancaMs = torneo ? new Date(torneo.startAt).getTime() : null;

  const [ahora, setAhora] = useState(() => Date.now());
  const enUltimaHora = arrancaMs != null && arrancaMs - ahora <= 3600000 && arrancaMs - ahora > 0;
  useEffect(() => {
    if (arrancaMs == null) return undefined;
    const t = setInterval(() => setAhora(Date.now()), enUltimaHora ? 1000 : 30000);
    return () => clearInterval(t);
  }, [arrancaMs, enUltimaHora]);

  const falta = arrancaMs != null ? arrancaMs - ahora : null;
  const visible = Boolean(torneo) && falta != null && !yaMeAnote && falta > -60000;
  // La portada esconde sus fichas saltarinas mientras la etiqueta ocupa su sitio.
  useEffect(() => { alMostrarse?.(visible); }, [visible, alMostrarse]);
  useEffect(() => () => alMostrarse?.(false), [alMostrarse]);
  if (!visible) return null;

  const porArrancar = falta <= 60000;
  const segundeando = !porArrancar && falta <= 3600000;
  const textoCuenta = porArrancar ? '¡YA VA!' : segundeando ? cuentaCorta(falta) : horaDelTorneo(torneo.startAt);
  const puntos = torneo.premiosPuntos?.length ? torneo.premiosPuntos : null;

  const cerrar = () => {
    const vivos = new Set((lista ?? []).map((t) => t.id));
    const nuevos = [...cerrados, torneo.id].filter((id) => vivos.has(id));
    setCerrados(nuevos);
    try { localStorage.setItem('reloj-torneo-cerrados', JSON.stringify(nuevos)); } catch { /* se cierra por la sesion */ }
  };

  const llegate = async () => {
    if (anotando) return;
    setAnotando(true);
    try {
      await torneos.anotarme(torneo.id);
      setYaMeAnote(true);
      avisar({ tipo: 'exito', titulo: `¡Anotado! ${torneo.name} te espera`, detalle: horaDelTorneo(torneo.startAt).toLowerCase() });
    } catch (err) {
      avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo') });
      onIrATorneos();
    } finally {
      setAnotando(false);
    }
  };

  return (
    <div className="tor-entra pointer-events-none absolute inset-x-0 z-[5] flex justify-start" style={{ bottom: abajo, paddingLeft: 14 }}>
      <div className="pointer-events-auto relative" data-testid="reloj-del-torneo" style={{ width: 176, maxWidth: '56vw', transform: `scale(${escala})`, transformOrigin: '0 100%' }}>
        <span aria-hidden className="absolute" style={{ inset: '-40px -60px -10px -20px', pointerEvents: 'none', zIndex: 0 }}>
          <span className="tor-rayo" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 50% at 40% 45%, rgba(215,232,255,0.55) 0%, transparent 70%)', mixBlendMode: 'screen' }} />
          <span className="tor-rayo" style={{ position: 'absolute', right: 4, top: 0, animationDelay: '0.15s', filter: 'drop-shadow(0 0 10px #dbe9ff)' }}>
            <Zap size={112} strokeWidth={0} fill="#eef4ff" />
          </span>
        </span>

        <span aria-hidden data-testid="reloj-del-torneo-cuerda" style={{ position: 'absolute', left: '50%', top: -56, width: 5, height: 60, marginLeft: -2, borderRadius: 3, background: 'repeating-linear-gradient(180deg, #d9c69c 0 4px, #8f7a52 4px 7px)', boxShadow: '0 2px 4px rgba(0,0,0,0.6)', transform: 'rotate(-5deg)', transformOrigin: 'top', zIndex: 1 }} />

        <div className="relative" style={{ color: '#2b1c10', transform: 'rotate(-4deg)', transformOrigin: '50% 0', filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.7))', zIndex: 1 }}>
          <img src="/torneos/limpia-lacre.webp" alt="" draggable={false} style={{ width: '100%', height: 'auto', display: 'block' }} />
          <div className="absolute flex flex-col items-center justify-center" style={{ left: '10%', right: '10%', top: '23%', bottom: '8%', textAlign: 'center' }}>
            <span style={{ display: 'block', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', lineHeight: 1.2, textTransform: 'uppercase' }}>
              {torneo.esRelampago ? 'Relámpago' : torneo.name?.trim() || 'Torneo'}
              {(segundeando || porArrancar) && (<><br />{horaDelTorneo(torneo.startAt)}</>)}
            </span>

            <button
              type="button"
              onClick={onIrATorneos}
              data-testid="reloj-del-torneo-cuenta"
              aria-label={`El torneo arranca: ${textoCuenta}. Ver la vitrina`}
              style={{ display: 'block', margin: '6px auto 8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif", fontVariantNumeric: 'tabular-nums', fontSize: porArrancar ? 20 : segundeando ? 26 : 16, fontWeight: 900, lineHeight: 1.05, color: '#B3222C', whiteSpace: 'nowrap' }}
            >
              {textoCuenta}
            </button>

            <span
              data-testid="reloj-del-torneo-sello"
              style={{ display: 'block', fontFamily: GRITO, fontSize: 17, letterSpacing: '0.12em', lineHeight: 1.1, background: 'linear-gradient(180deg, #2fbf74 0%, #1b9a5a 45%, #0d5a35 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))', margin: '0 0 6px' }}
            >
              ¡GRATIS!
            </span>

            {puntos && (
              <span data-testid="reloj-del-torneo-premios" style={{ display: 'block', textAlign: 'left', paddingLeft: 2, fontWeight: 800, fontSize: 12.5, lineHeight: 1.4 }}>
                {puntos.slice(0, 3).map((p, i) => (
                  <span key={i} className="flex items-center whitespace-nowrap" style={{ gap: 5 }}>
                    <span aria-hidden style={{ width: 13, height: 13, borderRadius: 999, background: MEDALLA[i], boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.4)', flex: 'none', display: 'grid', placeItems: 'center', fontSize: 8, fontFamily: GRITO, color: '#3b2a08' }}>{i + 1}</span>
                    {p} pts <span style={{ fontWeight: 700, color: '#6b5335', fontSize: 10.5 }}>{i === 0 ? 'y la copa' : PUESTO[i]}</span>
                  </span>
                ))}
              </span>
            )}

            <button
              type="button"
              onClick={llegate}
              disabled={anotando}
              data-testid="reloj-del-torneo-llegate"
              aria-label="Inscribirme en el torneo"
              className="tor-brillo relative overflow-hidden transition-transform active:scale-95 disabled:opacity-60"
              style={{ marginTop: 8, fontFamily: GRITO, fontWeight: 400, fontSize: 12, letterSpacing: '0.06em', color: '#FFFFFF', background: 'linear-gradient(180deg, #1b9a5a 0%, #0d5a35 100%)', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}
            >
              <span style={{ position: 'relative' }}>{anotando ? '…' : '¡LLÉGATE!'}</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={cerrar}
          data-testid="reloj-del-torneo-cerrar"
          aria-label="Cerrar este aviso"
          className="absolute grid place-items-center rounded-full transition-transform active:scale-90"
          style={{ top: -14, left: -10, width: 24, height: 24, zIndex: 3, background: 'rgba(0,0,0,0.68)', border: '1px solid rgba(197,160,40,0.55)', color: 'rgba(242,235,219,0.85)' }}
        >
          <X size={12} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
