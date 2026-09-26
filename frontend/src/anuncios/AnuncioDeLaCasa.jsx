import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { anuncioVigente, anuncioVisto } from './api.js';

/**
 * LOS ANUNCIOS DE LA CASA (seccion 214), copiados del truco
 * (`components/AnuncioDeLaCasa.tsx`). Las tres formas que eligio Raul, y cual
 * se usa lo decide el socio al escribir cada anuncio:
 *
 *   sobre   — le tapa la pantalla al entrar; no sigue hasta ENTENDIDO.
 *   pizarra — la nota clavada en el piso de la puerta; no tranca.
 *   casa    — se lo dice Zoraida (el mismo oleo del truco).
 *
 * El servidor decide SI le toca; esta pantalla solo decide COMO se ve.
 * La marca se manda AL CERRARLO, nunca al mostrarlo: un anuncio que se pierde
 * por un reload no se da por leido. El reloj («faltan 25 minutos») se calcula
 * aqui con la hora del evento, nunca se escribe en el texto.
 */
export const COLOR = {
  brass: '#D8B45C',
  brassBg: 'linear-gradient(180deg, #E0BE68 0%, #BE9A3E 100%)',
  brassInk: '#20140A',
  brassSoft: 'rgba(216,180,92,0.16)',
  ink: '#F2EBDB',
  dim: 'rgba(242,235,219,0.72)',
  line: 'rgba(233,214,166,0.22)',
  inset: 'rgba(0,0,0,0.26)',
  feltBg: 'radial-gradient(120% 62% at 50% 22%, #1D4531 0%, #143024 52%, #0C1E15 100%)'
};
export const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
export const BODY = "'Inter', system-ui, sans-serif";

/** Cuanto falta, en cristiano. Null si ya paso o no hay hora. */
export function faltaPara(eventoAt, ahora = Date.now()) {
  if (!eventoAt) return null;
  const t = new Date(eventoAt).getTime();
  if (Number.isNaN(t)) return null;
  const ms = t - ahora;
  if (ms <= 0) return null;
  const min = Math.round(ms / 60_000);
  if (min < 60) return `Faltan ${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  if (h < 24) return resto === 0 ? `Faltan ${h} ${h === 1 ? 'hora' : 'horas'}` : `Faltan ${h} h ${resto} min`;
  const d = Math.round(h / 24);
  return `Faltan ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** El reloj vivo: se recalcula cada 20 s mientras el anuncio esta en pantalla. */
function useFalta(eventoAt) {
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    if (!eventoAt) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 20_000);
    return () => clearInterval(t);
  }, [eventoAt]);
  return faltaPara(eventoAt, ahora);
}

/**
 * `activo`: el anuncio solo entra en la puerta, con alguien ya adentro.
 * `alMostrarse(forma|null)`: para que la puerta aparte lo que queda debajo.
 */
export default function AnuncioDeLaCasa({ activo, alMostrarse }) {
  const [anuncio, setAnuncio] = useState(null);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    anuncioVigente()
      .then((a) => { if (vivo) { setAnuncio(a); setCerrado(false); } })
      // Un anuncio que no carga no se le muestra a nadie. Nunca un error en pantalla.
      .catch(() => {});
    return () => { vivo = false; };
  }, [activo]);

  const visible = activo && anuncio && !cerrado;
  const falta = useFalta(visible ? anuncio.eventoAt : null);

  useEffect(() => {
    alMostrarse?.(visible ? anuncio.forma : null);
  }, [visible, anuncio, alMostrarse]);

  if (!visible) return null;

  const cerrar = () => {
    setCerrado(true);
    anuncioVisto(anuncio.id, anuncio.motivo).catch(() => {});
  };

  if (anuncio.forma === 'sobre') {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="anuncio-titulo"
        data-testid="anuncio-sobre"
        style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(4,12,8,0.75)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
      >
        <TarjetaSobre anuncio={anuncio} falta={falta} urgente={anuncio.motivo === 'recordatorio'} onCerrar={cerrar} />
      </div>,
      document.body
    );
  }
  if (anuncio.forma === 'pizarra') return <Pizarra anuncio={anuncio} falta={falta} onCerrar={cerrar} />;
  return <PorBocaDeLaCasa anuncio={anuncio} falta={falta} onCerrar={cerrar} />;
}

/* -------------------------------------------------------------- A · el sobre */

function TarjetaSobre({ anuncio, falta, urgente, onCerrar }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 340,
        background: 'linear-gradient(180deg, #1D4531 0%, #12291E 100%)',
        border: `1.5px solid ${COLOR.brass}`,
        borderRadius: 16,
        padding: '0 18px 17px',
        textAlign: 'center',
        boxShadow: '0 16px 34px rgba(0,0,0,0.55)'
      }}
    >
      <img src="/anuncios/sobre.webp" alt="" width={132} style={{ width: 132, height: 'auto', display: 'block', margin: '-26px auto 6px', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' }} />
      <p style={{ fontFamily: BODY, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: COLOR.brass, fontWeight: 800, margin: '0 0 8px' }}>
        {urgente ? 'Ya casi' : 'De la casa'}
      </p>
      <h2 id="anuncio-titulo" style={{ fontFamily: SERIF, fontSize: 21, margin: '0 0 9px', color: COLOR.ink, fontWeight: 700 }}>
        {anuncio.titulo}
      </h2>
      <p style={{ fontFamily: BODY, fontSize: 13.5, fontWeight: 500, color: 'rgba(242,235,219,0.88)', margin: '0 0 12px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {anuncio.cuerpo}
      </p>
      {falta && <Reloj texto={falta} />}
      <button
        type="button"
        onClick={onCerrar}
        data-anuncio-cerrar
        style={{ width: '100%', marginTop: 14, background: COLOR.brassBg, color: COLOR.brassInk, border: 'none', padding: 13, borderRadius: 12, fontFamily: BODY, fontWeight: 800, fontSize: 14.5, letterSpacing: '0.05em', cursor: 'pointer' }}
      >
        ENTENDIDO
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- B · la pizarra */

function Pizarra({ anuncio, falta, onCerrar }) {
  return (
    <div data-testid="anuncio-pizarra" style={{ position: 'relative', margin: '0 auto', maxWidth: 288, transform: 'rotate(-1.2deg)' }}>
      <img src="/anuncios/nota.webp" alt="" style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '14px 44px 16px 20px', textAlign: 'left' }}>
        <p style={{ fontFamily: BODY, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800, color: '#6B4E12', margin: 0 }}>De la casa</p>
        <h3 style={{ fontFamily: SERIF, fontSize: 15, margin: '2px 0', color: '#2A1D07', fontWeight: 700 }}>{anuncio.titulo}</h3>
        <p style={{ fontFamily: BODY, fontSize: 10.5, fontWeight: 600, color: '#2A1D07', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {falta ? `${falta} · ${anuncio.cuerpo}` : anuncio.cuerpo}
        </p>
      </div>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Bajar el aviso"
        data-anuncio-cerrar
        style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(32,20,10,0.55)', border: 'none', borderRadius: 999, color: '#F2EBDB', padding: 0, cursor: 'pointer' }}
      >
        <X size={14} strokeWidth={3} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- C · por boca de la casa */

function PorBocaDeLaCasa({ anuncio, falta, onCerrar }) {
  return (
    <div data-testid="anuncio-casa" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <img src="/anuncios/zoraida.webp" alt="Zoraida" width={46} height={46} style={{ width: 46, height: 46, flex: '0 0 46px', borderRadius: 999, border: `1.5px solid ${COLOR.brass}`, objectFit: 'cover' }} />
      <div style={{ flex: 1, background: 'rgba(6,20,13,0.82)', border: `1px solid ${COLOR.line}`, borderRadius: '14px 14px 14px 3px', padding: '11px 13px', boxShadow: '0 8px 18px rgba(0,0,0,0.45)' }}>
        <p style={{ fontFamily: BODY, fontSize: 10, color: COLOR.brass, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Zoraida</p>
        <p style={{ fontFamily: BODY, fontSize: 12.5, fontWeight: 500, margin: '5px 0 0', color: 'rgba(242,235,219,0.9)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
          {anuncio.titulo}: {anuncio.cuerpo}
          {falta ? ` (${falta.toLowerCase()})` : ''}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          data-anuncio-cerrar
          style={{ background: 'transparent', border: 'none', padding: '8px 0 0', fontFamily: BODY, fontSize: 11.5, color: COLOR.brass, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          Listo, gracias <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- la vista previa del socio */

/**
 * Como lo va a ver el jugador: LOS MISMOS componentes, sin servidor y sin
 * marcas (en el truco, una vista previa que es otra copia empieza a mentir el
 * dia que alguien cambia una de las dos).
 */
export function VistaPreviaAnuncio({ anuncio }) {
  const falta = useFalta(anuncio.eventoAt);
  const nada = () => {};
  if (anuncio.forma === 'sobre') {
    return (
      <div style={{ background: 'rgba(4,12,8,0.75)', borderRadius: 14, padding: '30px 16px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 300 }}>
          <TarjetaSobre anuncio={anuncio} falta={falta} urgente={anuncio.motivo === 'recordatorio'} onCerrar={nada} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: COLOR.feltBg, borderRadius: 14, border: `1px solid ${COLOR.line}`, padding: 13 }}>
      {anuncio.forma === 'pizarra'
        ? <Pizarra anuncio={anuncio} falta={falta} onCerrar={nada} />
        : <PorBocaDeLaCasa anuncio={anuncio} falta={falta} onCerrar={nada} />}
    </div>
  );
}

function Reloj({ texto }) {
  return (
    <p style={{ fontFamily: BODY, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: COLOR.brass, background: COLOR.brassSoft, border: `1px solid ${COLOR.line}`, borderRadius: 999, padding: '6px 12px', display: 'inline-block', margin: 0 }} data-anuncio-reloj>
      {texto}
    </p>
  );
}
