import { ChevronLeft } from 'lucide-react';
import Avatar from '../components/game/Avatar.jsx';
import { retratoUrl } from '../umbral/identidad.js';
import './torneos.css';

/**
 * LA UTILERIA DEL CLUB para los torneos, copiada del truco (`clubUtileria.ts`
 * y `Utileria.tsx`): la hoja de papel, el renglon, la pancarta chiquita, la
 * etiqueta de cordel, la banda de tela y el mensaje. Mismas piezas, mismos
 * cortes de nueve rebanadas, mismas reglas de contraste: sobre papel manda la
 * tinta; el verde del pano solo en la accion elegida.
 */

export const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
export const BODY = "'Inter', system-ui, sans-serif";
export const GRITO = "'Bowlby One', 'Arial Black', 'Franklin Gothic Heavy', sans-serif";

export const util = {
  tinta: '#241A10',
  tintaSuave: '#4A4038',
  tintaLinea: 'rgba(46,28,8,0.16)',
  urgente: '#8C2A18',
  enLinea: '#1F7A40'
};

const SIN_BORDE_PERO_CON_IMAGEN = { borderStyle: 'solid', borderWidth: 0, borderColor: 'transparent', background: 'none' };

export const hojaStyle = {
  borderImage: 'url(/utileria/hoja-lisa.webp) 60 fill stretch',
  borderWidth: 15,
  borderStyle: 'solid',
  padding: '9px 9px 10px',
  filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))'
};

const mensajeStyle = {
  borderImage: 'url(/utileria/hoja-lisa.webp) 60 fill stretch',
  borderWidth: 16,
  borderStyle: 'solid',
  padding: '10px 10px 12px',
  textAlign: 'center',
  filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.6))'
};

const etiquetaStyle = {
  ...SIN_BORDE_PERO_CON_IMAGEN,
  borderImage: 'url(/torneos/etiqueta-papel.webp) 26 30 26 95 fill stretch',
  borderWidth: '13px 15px 13px 46px',
  padding: '3px 4px 4px 2px',
  fontFamily: BODY,
  fontWeight: 800,
  fontSize: 12.5,
  lineHeight: 1.25,
  color: util.tinta,
  cursor: 'pointer',
  display: 'inline-block',
  maxWidth: '100%',
  textAlign: 'center',
  whiteSpace: 'normal',
  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))'
};

const bandaStyle = {
  ...SIN_BORDE_PERO_CON_IMAGEN,
  borderImage: 'url(/torneos/banda-tela.webp) 96 fill / 30px 46px 22px / 0 stretch',
  padding: '26px 30px 34px',
  textAlign: 'center',
  width: '100%',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 104,
  cursor: 'pointer',
  filter: 'drop-shadow(0 5px 11px rgba(0,0,0,0.62))'
};

const gritoStyle = {
  fontFamily: GRITO,
  textTransform: 'uppercase',
  fontWeight: 400,
  letterSpacing: '0.008em',
  WebkitTextStroke: '0.115em #5C3411',
  paintOrder: 'stroke fill',
  background: 'linear-gradient(180deg, #FDF3C8 0%, #F6CE5C 38%, #E0A32E 62%, #AE721A 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  filter: 'drop-shadow(0 0.045em 0 #5C3411) drop-shadow(0 0.085em 0 #3B2109) drop-shadow(0 0.14em 0.11em rgba(0,0,0,0.55))'
};

const pancartaMiniStyle = {
  flex: 'none',
  width: 112,
  height: 67,
  display: 'grid',
  placeItems: 'center',
  background: 'url(/torneos/pancarta-mini-verde.webp) center/contain no-repeat',
  border: 0,
  padding: 0,
  cursor: 'pointer',
  filter: 'drop-shadow(0 4px 7px rgba(0,0,0,0.45))'
};

const letraPancartaStyle = {
  fontFamily: GRITO,
  textTransform: 'uppercase',
  fontWeight: 400,
  fontSize: 14,
  lineHeight: 1,
  color: '#FFFFFF',
  textShadow: '0 1px 0 rgba(0,0,0,0.45), 0 2px 5px rgba(0,0,0,0.5)',
  transform: 'translateY(-8%)',
  display: 'flex',
  alignItems: 'center',
  gap: 5
};

/** Lo que va ENCIMA del papel: el vocabulario en tinta. */
export const papel = {
  seccion: { fontFamily: BODY, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: util.tintaSuave, margin: 0 },
  titulo: { fontFamily: SERIF, fontWeight: 700, fontSize: 17, lineHeight: 1.25, letterSpacing: '0.01em', color: util.tinta, margin: 0 },
  texto: { fontFamily: BODY, fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: util.tintaSuave, margin: 0 },
  fuerte: { fontFamily: BODY, fontSize: 13, fontWeight: 700, color: util.tinta, margin: 0 },
  cifra: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 12, fontWeight: 700, color: util.tinta, fontVariantNumeric: 'tabular-nums' },
  boton: { fontFamily: BODY, fontWeight: 700, fontSize: 13.5, minHeight: 42, borderRadius: 9, padding: '10px 15px', background: 'linear-gradient(180deg, #2C6B45 0%, #1D5233 100%)', color: '#F6F2E4', border: '1.5px solid #23553A', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', cursor: 'pointer' },
  botonFantasma: { fontFamily: BODY, fontWeight: 600, fontSize: 13.5, minHeight: 42, borderRadius: 9, padding: '10px 15px', background: 'transparent', color: util.tinta, border: `1.5px solid ${util.tintaLinea}`, cursor: 'pointer' },
  ficha: { fontFamily: BODY, fontSize: 11, fontWeight: 700, minHeight: 30, padding: '6px 12px', borderRadius: 999, background: 'transparent', color: util.tintaSuave, border: `1.5px solid ${util.tintaLinea}`, cursor: 'pointer', whiteSpace: 'nowrap' },
  fichaOn: { fontFamily: BODY, fontSize: 11, fontWeight: 700, minHeight: 30, padding: '6px 12px', borderRadius: 999, background: 'linear-gradient(180deg, #2C6B45 0%, #1D5233 100%)', color: '#F6F2E4', border: '1.5px solid #23553A', cursor: 'pointer', whiteSpace: 'nowrap' },
  aviso: { fontFamily: BODY, fontSize: 11, lineHeight: 1.45, color: util.tinta, background: 'rgba(46,28,8,0.06)', border: `1px solid ${util.tintaLinea}`, borderRadius: 8, padding: '9px 11px' },
  bloque: { background: 'rgba(46,28,8,0.05)', border: `1px solid ${util.tintaLinea}`, borderRadius: 9, padding: '9px 11px' },
  bloqueVivo: { background: 'rgba(44,107,69,0.13)', border: '1px solid rgba(44,107,69,0.42)', borderRadius: 9, padding: '9px 11px' }
};

/* ---------------------------------------------------------------- piezas */

export function Hoja({ children, style, testid }) {
  return <div data-testid={testid} style={{ ...hojaStyle, ...style }}>{children}</div>;
}

export function Mensaje({ titulo, detalle, destacado, children, style, grande = false }) {
  return (
    <div style={{ ...mensajeStyle, ...(grande ? { padding: '18px 16px 20px' } : {}), ...style }}>
      <div style={{ fontFamily: SERIF, textTransform: 'uppercase', fontSize: grande ? 23 : 17, lineHeight: 1.08, letterSpacing: '0.02em', color: util.tinta, fontWeight: 700 }}>
        {titulo}
      </div>
      {detalle && (
        <div style={{ fontFamily: BODY, fontSize: grande ? 14 : 11.5, color: grande ? util.tinta : util.tintaSuave, marginTop: grande ? 10 : 6, fontWeight: grande ? 600 : 500, lineHeight: 1.35 }}>
          {detalle}
        </div>
      )}
      {destacado != null && (
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: grande ? 48 : 28, color: util.urgente, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          {destacado}
        </div>
      )}
      {children}
    </div>
  );
}

export function Renglon({ titulo, pie, dato, icono, onClick, testid, ultimo }) {
  const contenido = (
    <>
      {icono != null && <span style={{ flex: 'none', display: 'grid', placeItems: 'center' }}>{icono}</span>}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontFamily: BODY, fontSize: 13.5, fontWeight: 800, color: util.tinta, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</span>
        {pie && <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 500, color: util.tintaSuave, lineHeight: 1.4 }}>{pie}</span>}
      </span>
      {dato != null && (
        <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 800, color: util.tinta, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{dato}</span>
      )}
    </>
  );
  const estilo = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    padding: '8px 0',
    width: '100%',
    background: 'none',
    textAlign: 'left',
    borderStyle: 'solid',
    borderWidth: 0,
    borderColor: 'transparent',
    borderBottom: ultimo ? 0 : `1px solid ${util.tintaLinea}`,
    cursor: onClick ? 'pointer' : undefined
  };
  return onClick ? (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }} data-testid={testid} style={estilo}>{contenido}</div>
  ) : (
    <div data-testid={testid} style={estilo}>{contenido}</div>
  );
}

/** La pancarta en miniatura: verde para entrar, terracota para lo que esta pasando. */
export function PancartaMini({ children, roja, vivo, onClick, testid, ariaLabel }) {
  const activar = (e) => { e.stopPropagation(); onClick?.(); };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={activar}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activar(e); } }}
      data-testid={testid}
      aria-label={ariaLabel}
      style={roja ? { ...pancartaMiniStyle, background: 'url(/torneos/pancarta-mini-roja.webp) center/contain no-repeat' } : pancartaMiniStyle}
    >
      <span style={letraPancartaStyle}>
        {vivo && <i aria-hidden className="tor-latido" style={{ width: 6, height: 6, borderRadius: 999, background: '#FFFFFF', display: 'inline-block', flex: 'none' }} />}
        {children}
      </span>
    </span>
  );
}

/** Accion secundaria: la etiqueta de papel colgada de su cordel. */
export function Etiqueta({ children, onClick, disabled, testid, style }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testid} className="transition-transform active:scale-95" style={{ ...etiquetaStyle, opacity: disabled ? 0.55 : 1, ...style }}>
      {children}
    </button>
  );
}

/** Accion principal: la banda de tela, con la manito que toca. UNA por pantalla. */
export function Banda({ children, onClick, disabled, testid, manito = true }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testid} className="transition-transform active:scale-[0.985]" style={{ ...bandaStyle, opacity: disabled ? 0.55 : 1 }}>
      <span style={{ ...gritoStyle, fontSize: 19 }}>{children}</span>
      {manito && !disabled && (
        <img src="/umbral/manito.webp" alt="" aria-hidden className="tor-manito" style={{ position: 'absolute', right: 20, bottom: 12, height: 38, width: 'auto', pointerEvents: 'none', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))' }} />
      )}
    </button>
  );
}

/** El retrato del jugador: el de la casa si lo tiene, el de su nombre si no. */
export function Retrato({ jugador, tamano = 32 }) {
  const semilla = jugador?.retrato || jugador?.displayName || 'jugador';
  return <Avatar semilla={semilla} tamano={tamano} aro={false} />;
}

export { retratoUrl };

/* ---------------------------------------------- las medallas de puntos */

const CINTA = { width: 16, height: 16, background: 'linear-gradient(90deg, #8a1620, #c22633, #8a1620)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)' };
const MONEDA = {
  1: { background: 'radial-gradient(circle at 35% 30%, #FFF1C2, #E2BE68 55%, #9A7A2E)', color: '#4a3308' },
  2: { background: 'radial-gradient(circle at 35% 30%, #ffffff, #d7dbe0 55%, #8f96a0)', color: '#2a2e35' },
  3: { background: 'radial-gradient(circle at 35% 30%, #f2c9a0, #d29a63 55%, #8a5325)', color: '#3a1f08' }
};
export const PUESTO = ['campeón', 'segundo', 'tercero'];

/**
 * LAS TRES MEDALLAS (truco, `MedallasPremios`): oro, plata y bronce colgando
 * de su cinta. Aqui no hay plata: debajo va la copa del puesto y los puntos
 * de la clasificacion que se lleva.
 */
export function MedallasPuntos({ puntos, size = 54 }) {
  return (
    <span className="flex" style={{ gap: 10, marginTop: 6, maxWidth: 270 }} data-testid="medallas-puntos">
      {puntos.slice(0, 3).map((p, i) => (
        <span key={i} className="flex flex-col items-center" style={{ flex: 1, minWidth: 0 }}>
          <span aria-hidden style={CINTA} />
          <span
            className="tor-brillo"
            style={{
              width: size,
              height: size,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              fontFamily: GRITO,
              fontSize: Math.round(size * 0.38),
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.35)',
              ...MONEDA[i + 1]
            }}
          >
            {i + 1}
          </span>
          <b style={{ fontFamily: BODY, fontSize: 13.5, marginTop: 5, color: '#2b1c10', fontWeight: 800, whiteSpace: 'nowrap' }}>+{p} pts</b>
          <span style={{ fontFamily: BODY, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b5335', fontWeight: 700 }}>{PUESTO[i]}</span>
        </span>
      ))}
    </span>
  );
}

/* --------------------------------------------------- el cuarto de la vitrina */

/**
 * La pantalla de la vitrina (truco, `ClubScreen` con `cuarto="vitrina"`): la
 * escena del salon de trofeos detras, velos arriba y abajo, el rotulo del
 * cuarto, el titulo sin caja y el contenido encima. Abajo, el dock.
 */
export function CuartoVitrina({ titulo, subtitulo, onVolver, accion, dock, children, testid }) {
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#1a120b] text-domino-cream" data-testid={testid}>
      <img src="/torneos/02-vitrina.webp" alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 52%' }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,4,3,0.9) 0%, rgba(6,4,3,0.5) 16%, rgba(6,4,3,0) 34%),' +
            'linear-gradient(0deg, rgba(6,4,3,0.9) 0%, rgba(6,4,3,0.42) 18%, rgba(6,4,3,0) 34%)'
        }}
      />
      <header className="relative z-[2] flex flex-none items-center justify-between gap-3 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        {onVolver ? (
          <button type="button" onClick={onVolver} aria-label="Atrás" data-testid="button-back" className="grid h-8 w-8 flex-none place-items-center rounded-full" style={{ color: '#F2EBDB', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(233,214,166,0.28)' }}>
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
        ) : (
          <span className="w-8 flex-none" />
        )}
        <span style={{ fontFamily: BODY, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.2em', color: '#C9A46A', textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}>LA VITRINA</span>
        <span className="flex min-w-[32px] flex-none items-center justify-end">{accion}</span>
      </header>
      {titulo && (
        <div className="relative z-[2] flex-none px-4 pt-2.5">
          <h1 className="m-0 leading-[1.05]" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(19px, 6.1vw, 25px)', letterSpacing: '0.03em', color: '#F0DCA6', textShadow: '0 2px 3px rgba(0,0,0,0.9), 0 6px 18px rgba(0,0,0,0.7)', textWrap: 'balance' }}>
            {typeof titulo === 'string' ? titulo.replace(/ ([ap])\. ?m\./g, ' $1. m.') : titulo}
          </h1>
          {subtitulo && (
            <p className="m-0 mt-1.5" style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: 'rgba(245,236,220,0.82)', textShadow: '0 1px 7px rgba(0,0,0,0.96)' }}>{subtitulo}</p>
          )}
        </div>
      )}
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3">
        <div className="mx-auto flex w-full max-w-md flex-col" style={{ gap: 12 }}>{children}</div>
      </div>
      {dock && <div className="relative z-[3] flex-none">{dock}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- las horas */

export function formatStart(iso) {
  try {
    return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/** «8:00»: la hora pelada para la tira del Relampago. */
export function horaChip(iso) {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s*[ap]\.?\s*m\.?\s*$/i, '').trim();
}

/** «8:00 p. m.» con su am/pm. */
export function horaLarga(iso) {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

export function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function haceCuanto(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.round(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}
