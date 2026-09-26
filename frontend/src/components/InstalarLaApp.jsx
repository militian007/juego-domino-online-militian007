import { useState } from 'react';
import { ChevronRight, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.js';

/**
 * INSTALAR LA APP (seccion 209). Copia del truco (`InstalarLaApp.tsx`, Raul
 * 14-sep: «en el perfil hay que colocar como hacerlo»), con los mismos sitios:
 *   - la TARJETA oscura encima de la capsula del salon, en la portada;
 *   - el enlace «Instalala en tu telefono · ver como» para el que aun no ha
 *     entrado, desde su segunda visita;
 *   - la fila «Instalar la app» del perfil (aqui, la hoja de «como te llaman»);
 *   - la pagina suelta /?instalar o /instalar, para pegar en el chat.
 * Iconos de lucide en vez de los emojis del truco (regla del repo).
 */
const BODY = "'Inter', system-ui, sans-serif";
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

/** El papel del club, la misma hoja del truco. */
export const papelStyle = {
  borderImage: 'url(/utileria/hoja-lisa.webp) 60 fill stretch',
  borderWidth: 16,
  borderStyle: 'solid',
  padding: '10px 10px 12px',
  filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.6))'
};

/** El navegador de adentro de WhatsApp/Instagram/Facebook no deja instalar. */
export function dentroDeOtraApp() {
  if (typeof navigator === 'undefined') return false;
  return /WhatsApp|FBAN|FBAV|FB_IAB|Instagram|Line\//i.test(navigator.userAgent);
}

const sitio = () => (typeof window === 'undefined' ? 'el dominó' : window.location.host);

const PASOS = {
  android: [
    { texto: `Abre ${sitio()} en Chrome (no desde WhatsApp).` },
    { texto: 'Toca los tres puntos arriba a la derecha.', tecla: '⋮' },
    { texto: 'Toca «Instalar app» o «Añadir a pantalla de inicio».' },
    { texto: 'Listo: el dominó queda en tu pantalla como cualquier app.' }
  ],
  iphone: [
    { texto: `Abre ${sitio()} en Safari.` },
    { texto: 'Toca Compartir (el cuadrito con la flecha, abajo).', tecla: '⬆' },
    { texto: 'Baja y toca «Añadir a pantalla de inicio».' },
    { texto: 'Toca Añadir. Ya está en tu pantalla.' }
  ]
};

export function InstalarLaApp({ enPagina = false }) {
  const pwa = usePWAInstall();
  const [telefono, setTelefono] = useState(pwa.isIOS ? 'iphone' : 'android');
  const [instalando, setInstalando] = useState(false);
  const atrapado = dentroDeOtraApp();

  async function instalar() {
    if (!pwa.canInstall || instalando) return;
    setInstalando(true);
    try {
      await pwa.install();
    } finally {
      setInstalando(false);
    }
  }

  const chip = (t, etiqueta) => (
    <button
      key={t}
      type="button"
      onClick={() => setTelefono(t)}
      data-testid={`instalar-telefono-${t}`}
      aria-pressed={telefono === t}
      style={{
        fontFamily: BODY, fontSize: 13, fontWeight: 800, padding: '8px 6px', borderRadius: 999,
        border: `1.5px solid ${telefono === t ? '#B9922F' : '#C9B58A'}`,
        background: telefono === t ? '#D8B45C' : '#FFFDF7', color: '#2B2419', cursor: 'pointer'
      }}
    >
      {etiqueta}
    </button>
  );

  return (
    <div data-testid="instalar-la-app" style={{ color: '#2B2419', textAlign: 'left' }}>
      {atrapado && (
        <div
          data-testid="instalar-aviso-whatsapp"
          style={{ background: '#FFF1E8', border: '1.5px solid #E8A48C', borderRadius: 12, padding: '9px 12px', fontFamily: BODY, fontSize: 12.5, lineHeight: 1.4, marginBottom: 10 }}
        >
          Estás dentro de WhatsApp. Toca ⋮ arriba y luego <b>«Abrir en Chrome»</b> (o en Safari) para poder instalarla.
        </div>
      )}
      <p style={{ fontFamily: SERIF, fontSize: enPagina ? 14 : 12, letterSpacing: '0.12em', color: '#7A5A16', margin: 0 }}>INSTALAR LA APP</p>
      <p style={{ fontFamily: BODY, fontSize: 15, fontWeight: 800, margin: '4px 0 2px' }}>
        {pwa.isInstalled ? 'Ya la tienes instalada ✓' : 'Tenla en tu pantalla, como cualquier app'}
      </p>
      <p style={{ fontFamily: BODY, fontSize: 12.5, color: '#5C5142', margin: '0 0 10px', lineHeight: 1.45 }}>
        Sin tienda ni descarga: se instala desde el navegador en 10 segundos. Con la app instalada te llegan los avisos.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {chip('android', 'Android')}
        {chip('iphone', 'iPhone')}
      </div>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} data-testid={`instalar-pasos-${telefono}`}>
        {PASOS[telefono].map((p, i) => (
          <li
            key={i}
            style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10, alignItems: 'center', background: '#FFFDF7', border: '1.5px solid #C9B58A', borderRadius: 12, padding: '9px 10px', marginBottom: 7, fontFamily: BODY, fontSize: 12.5, lineHeight: 1.35 }}
          >
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#D8B45C', color: '#2B2419', fontWeight: 900, display: 'grid', placeItems: 'center', fontSize: 13 }}>{i + 1}</span>
            <span>
              {p.texto}
              {p.tecla && (
                <span style={{ marginLeft: 6, fontFamily: 'ui-monospace, monospace', background: '#2B2419', color: '#F5F0E8', borderRadius: 6, padding: '1px 6px', fontSize: 11 }}>{p.tecla}</span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {pwa.canInstall && !pwa.isInstalled && (
        <button
          type="button"
          onClick={() => void instalar()}
          disabled={instalando}
          data-testid="instalar-ahora"
          style={{ marginTop: 8, width: '100%', fontFamily: BODY, fontSize: 14, fontWeight: 900, padding: '13px 10px', borderRadius: 14, border: 0, background: '#D8B45C', color: '#2B2419', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {instalando ? 'Un momento…' : <><Smartphone size={17} aria-hidden /> Instalar ahora</>}
        </button>
      )}
      <p style={{ fontFamily: BODY, fontSize: 11.5, color: '#5C5142', margin: '8px 0 0', textAlign: 'center' }}>
        {pwa.canInstall && !pwa.isInstalled
          ? '¿No te sale el cuadro? Sigue los pasos de arriba.'
          : `Si alguien pregunta cómo instalarla, mándale: ${sitio()}/?instalar`}
      </p>
    </div>
  );
}

/**
 * LA TARJETA DE LA PORTADA (el truco la escogio como «la C»): oscura, encima de
 * la capsula del salon. Si el telefono deja instalar de una, abre el cuadro
 * nativo; si no, la hoja con los pasos. La X la calla 7 dias en este telefono.
 */
const TARJETA_QUITADA_KEY = 'instalar.tarjeta.quitada';
const TARJETA_QUITADA_MS = 7 * 24 * 60 * 60 * 1000;

function tarjetaQuitada() {
  try {
    const v = localStorage.getItem(TARJETA_QUITADA_KEY);
    return !!v && Date.now() - Number(v) < TARJETA_QUITADA_MS;
  } catch {
    return false;
  }
}

/** Alto que ocupa la tarjeta (con su aire): lo que flota encima sube eso. */
export const TARJETA_INSTALAR_ALTO = 72;

export function useTarjetaInstalar() {
  const pwa = usePWAInstall();
  const [quitada, setQuitada] = useState(tarjetaQuitada);
  function quitar() {
    try {
      localStorage.setItem(TARJETA_QUITADA_KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento: se va solo por esta vez */
    }
    setQuitada(true);
  }
  return { visible: !pwa.isInstalled && !quitada, quitar };
}

export function TarjetaInstalar({ onComoSeHace, onQuitar }) {
  const pwa = usePWAInstall();
  const [instalando, setInstalando] = useState(false);

  async function tocar() {
    if (instalando) return;
    if (pwa.canInstall) {
      setInstalando(true);
      try {
        await pwa.install();
      } finally {
        setInstalando(false);
      }
      return;
    }
    onComoSeHace();
  }

  return (
    <div
      data-testid="tarjeta-instalar"
      role="group"
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(10,20,13,0.94)', border: '1.5px solid rgba(229,194,106,0.6)', borderRadius: 14, padding: '10px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
    >
      <button
        type="button"
        onClick={() => void tocar()}
        disabled={instalando}
        data-testid="tarjeta-instalar-abrir"
        aria-label={pwa.canInstall ? 'Instalar el dominó' : 'Cómo instalar la app'}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
      >
        <span
          aria-hidden
          style={{ width: 38, height: 38, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center', color: '#1a1206', background: 'linear-gradient(135deg, #8a6a2a, #D8B45C 60%, #8a6a2a)' }}
        >
          <Smartphone size={20} strokeWidth={2.4} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: BODY, fontWeight: 800, fontSize: 13.5, color: '#F2D98A', lineHeight: 1.2 }}>
            {instalando ? 'Un momento…' : 'Instala la app'}
          </span>
          <span style={{ display: 'block', fontFamily: BODY, fontWeight: 500, fontSize: 11.5, color: 'rgba(245,240,232,0.75)', lineHeight: 1.3 }}>
            {pwa.canInstall ? 'Un toque y te queda en la pantalla, con avisos' : 'Te queda en la pantalla, con avisos · toca y te digo cómo'}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onQuitar}
        aria-label="Quitar este aviso"
        data-testid="tarjeta-instalar-quitar"
        style={{ flex: 'none', width: 30, height: 30, borderRadius: 999, background: 'rgba(245,240,232,0.08)', border: '1px solid rgba(245,240,232,0.18)', color: 'rgba(245,240,232,0.8)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
      >
        <X size={14} strokeWidth={2.6} />
      </button>
    </div>
  );
}

/** La fila del perfil: se abre y muestra la hoja completa, en papel. */
export function SeccionInstalarPerfil() {
  const [abierta, setAbierta] = useState(false);
  const pwa = usePWAInstall();
  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        data-testid="button-instalar-app"
        aria-expanded={abierta}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(229,194,106,0.25)' }}
      >
        <div className="flex items-center gap-3">
          <Smartphone size={18} className="text-domino-accent" aria-hidden />
          <span>
            <span className="block text-[15px] font-bold text-domino-cream">Instalar la app</span>
            <span className="block text-[12px] text-domino-cream/65">
              {pwa.isInstalled ? 'Ya la tienes en tu pantalla' : 'Cómo ponerla en tu pantalla, paso a paso'}
            </span>
          </span>
        </div>
        <ChevronRight size={18} className="text-domino-accent/75 transition-transform" style={{ transform: abierta ? 'rotate(90deg)' : 'none' }} aria-hidden />
      </button>
      {abierta && (
        <div style={{ ...papelStyle, marginTop: 8, padding: '12px 12px 14px' }}>
          <InstalarLaApp />
        </div>
      )}
    </div>
  );
}

/** La pagina suelta: /?instalar o /instalar, para pegar en el chat. */
export function PaginaInstalar({ onVolver }) {
  return (
    <div
      data-testid="pagina-instalar"
      className="min-h-[100dvh]"
      style={{ background: '#0F1F17', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'max(16px, env(safe-area-inset-top)) 12px 24px' }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <button
          type="button"
          onClick={onVolver}
          data-testid="instalar-volver"
          style={{ background: 'none', border: 0, color: '#D8B45C', fontFamily: BODY, fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '6px 0', marginBottom: 6 }}
        >
          ‹ Ir al dominó
        </button>
        <div style={{ ...papelStyle, padding: '14px 12px 16px' }}>
          <InstalarLaApp enPagina />
        </div>
      </div>
    </div>
  );
}
