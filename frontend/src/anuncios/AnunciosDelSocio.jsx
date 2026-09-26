import { useCallback, useEffect, useState } from 'react';
import { Marco, llaveDelSocio } from '../socio/CuartoDelSocio.jsx';
import { socioAnuncios } from './api.js';
import { VistaPreviaAnuncio, COLOR, SERIF, BODY } from './AnuncioDeLaCasa.jsx';

/**
 * LOS ANUNCIOS DEL SOCIO (seccion 214), copia de `AdminAnunciosScreen` del
 * truco. Todo se elige al escribir: por donde llega, a quien, hasta cuando,
 * cuantas veces y la hora del evento. Hay UN anuncio a la vez: publicar
 * reemplaza al anterior. Debajo, «Los que se han puesto», con su chapa.
 *
 * En el truco el socio mira y el admin publica; aqui la llave es la unica
 * puerta, asi que quien tiene la llave publica y baja.
 */
const FORMAS = [
  { v: 'sobre', label: 'El sobre', ayuda: 'Le tapa la pantalla. No sigue hasta cerrarlo.' },
  { v: 'pizarra', label: 'La pizarra', ayuda: 'Clavada en el piso de la puerta. No tranca.' },
  { v: 'casa', label: 'Por boca de la casa', ayuda: 'Se lo dice Zoraida al entrar.' }
];
const PUBLICOS = [
  { v: 'todos', label: 'A todos' },
  { v: 'cuenta', label: 'Sólo con cuenta' },
  { v: 'invitados', label: 'Sólo invitados' }
];
const VECES = [
  { v: 'una', label: 'Una vez y ya', ayuda: 'Lo ve una sola vez. Es lo que no cansa.' },
  { v: 'siempre', label: 'Cada vez que entre', ayuda: 'Para algo grave, como un corte del servidor.' },
  { v: 'recordar', label: 'Una vez, y recordar', ayuda: 'Y otra vez cuando falte poco.' }
];
const ATAJOS = [
  { label: '30 min', min: 30 },
  { label: '2 h', min: 120 },
  { label: '4 h', min: 240 },
  { label: '1 día', min: 1440 },
  { label: 'Hasta que lo baje', min: null }
];

/** `datetime-local` habla en hora local sin zona; el servidor habla ISO. */
function aLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function aISO(local) {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function fechaCorta(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
const etiqueta = (lista, v) => lista.find((x) => x.v === v)?.label ?? v;

export default function AnunciosDelSocio() {
  const [llave] = useState(llaveDelSocio);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [vivo, setVivo] = useState(null);
  const [vigente, setVigente] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [forma, setForma] = useState('sobre');
  const [publico, setPublico] = useState('todos');
  const [veces, setVeces] = useState('una');
  const [hasta, setHasta] = useState('');
  const [eventoAt, setEventoAt] = useState('');
  const [recordarMin, setRecordarMin] = useState(30);

  const refrescar = useCallback(async () => {
    try {
      const [g, h] = await Promise.all([socioAnuncios.guardado(llave), socioAnuncios.historial(llave)]);
      setVivo(g.anuncio);
      setVigente(g.vigente);
      setHistorial(h.anuncios);
      setError(null);
    } catch (e) {
      setError(e.message || 'No se pudo leer');
    } finally {
      setCargando(false);
    }
  }, [llave]);

  useEffect(() => { refrescar(); }, [refrescar]);

  const aplicarAtajo = (min) => setHasta(min === null ? '' : aLocal(new Date(Date.now() + min * 60_000).toISOString()));
  const atajoElegido = ATAJOS.find((a) => (a.min === null && !hasta) || (a.min !== null && hasta !== '' && Math.abs(new Date(hasta).getTime() - Date.now() - a.min * 60_000) < 90_000))?.label ?? '';

  const publicar = async () => {
    if (!titulo.trim() || !cuerpo.trim()) { setAviso('Falta el título o el texto.'); return; }
    if (veces === 'recordar' && !eventoAt) { setAviso('Para recordar hace falta la hora del evento.'); return; }
    setEnviando(true);
    try {
      await socioAnuncios.publicar(llave, {
        titulo: titulo.trim(),
        cuerpo: cuerpo.trim(),
        forma,
        publico,
        veces,
        hasta: aISO(hasta),
        eventoAt: aISO(eventoAt),
        recordarMin: veces === 'recordar' ? recordarMin : null
      });
      setAviso('Anuncio publicado. Ya les está saliendo.');
      setTitulo('');
      setCuerpo('');
      await refrescar();
    } catch (e) {
      setAviso(e.message || 'No se pudo publicar');
    } finally {
      setEnviando(false);
    }
  };

  const bajar = async () => {
    setEnviando(true);
    try {
      await socioAnuncios.bajar(llave);
      setAviso('Anuncio bajado.');
      await refrescar();
    } catch (e) {
      setAviso(e.message || 'No se pudo bajar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Marco titulo="Los anuncios" llave={llave} error={error}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {aviso && <p className="rounded-lg border border-domino-accent/40 bg-domino-accent/10 px-3 py-2 text-[12.5px] font-bold text-domino-accent" data-anuncio-aviso>{aviso}</p>}

        {!cargando && vivo && (
          <div style={{ background: COLOR.inset, border: `1px solid ${vigente ? COLOR.brass : COLOR.line}`, borderRadius: 12, padding: '12px 14px' }} data-anuncio-vivo>
            <p style={rotulo}>{vigente ? 'Ahora mismo está saliendo' : 'Guardado, fuera de hora'}</p>
            <p style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink, margin: '6px 0 3px' }}>{vivo.titulo}</p>
            <p style={{ fontFamily: BODY, fontSize: 13, color: COLOR.dim, margin: 0 }}>
              {etiqueta(FORMAS, vivo.forma)} · {etiqueta(PUBLICOS, vivo.publico)} · {etiqueta(VECES, vivo.veces)}
            </p>
            <p style={{ fontFamily: BODY, fontSize: 12.5, color: COLOR.dim, margin: '4px 0 10px' }}>
              {vivo.hasta ? `Hasta el ${new Date(vivo.hasta).toLocaleString('es-VE')}` : 'Hasta que lo bajes'}
            </p>
            <button type="button" onClick={bajar} disabled={enviando} style={botonBajar} data-anuncio-bajar>BAJARLO AHORA</button>
          </div>
        )}

        <div>
          <p style={rotulo}>Así lo van a ver</p>
          <div style={{ marginTop: 8 }}>
            <VistaPreviaAnuncio
              anuncio={{
                id: 'vista-previa',
                titulo: titulo.trim() || 'Torneo del sábado',
                cuerpo: cuerpo.trim() || 'Este sábado a las 8 hay torneo en la mesa de dominó.',
                forma,
                eventoAt: aISO(eventoAt),
                motivo: 'vista'
              }}
            />
          </div>
          <p style={ayuda}>
            {forma === 'sobre' ? 'Le tapa la pantalla al entrar.' : 'Va apoyado en el piso de la puerta, encima del salón.'}
            {eventoAt ? ' El reloj se calcula solo para cada quien.' : ''}
          </p>
        </div>

        <Campo label="Título">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} placeholder="Torneo del sábado" style={entrada} data-anuncio-titulo />
        </Campo>

        <Campo label="El anuncio">
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} maxLength={600} rows={4} placeholder="Este sábado a las 8 hay torneo en la mesa de dominó." style={{ ...entrada, resize: 'vertical', lineHeight: 1.45 }} data-anuncio-cuerpo />
        </Campo>

        <Campo label="Por dónde le llega">
          <Botonera grupo="forma" opciones={FORMAS} valor={forma} onElegir={setForma} />
          <p style={ayuda}>{FORMAS.find((f) => f.v === forma)?.ayuda}</p>
        </Campo>

        <Campo label="A quién">
          <Botonera grupo="publico" opciones={PUBLICOS} valor={publico} onElegir={setPublico} />
          <p style={ayuda}>Al invitado, que ya lo vio se le recuerda en su teléfono; si cambia de teléfono, le sale otra vez.</p>
        </Campo>

        <Campo label="Hasta cuándo">
          <Botonera grupo="hasta" opciones={ATAJOS.map((a) => ({ v: a.label, label: a.label }))} valor={atajoElegido} onElegir={(label) => aplicarAtajo(ATAJOS.find((a) => a.label === label)?.min ?? null)} />
          <input type="datetime-local" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ ...entrada, marginTop: 9, colorScheme: 'dark' }} data-anuncio-hasta />
          <p style={ayuda}>Vacío = vive hasta que lo bajes. Empieza a salir apenas lo publiques.</p>
        </Campo>

        <Campo label="Cuántas veces le sale a cada quien">
          <Botonera grupo="veces" opciones={VECES} valor={veces} onElegir={setVeces} />
          <p style={ayuda}>{VECES.find((v) => v.v === veces)?.ayuda}</p>
          {veces === 'recordar' && (
            <div style={{ marginTop: 9 }}>
              <Botonera grupo="recordar" opciones={[10, 30, 60].map((m) => ({ v: String(m), label: `${m} min antes` }))} valor={String(recordarMin)} onElegir={(v) => setRecordarMin(Number(v))} />
            </div>
          )}
        </Campo>

        <Campo label="Hora del evento — opcional">
          <input type="datetime-local" value={eventoAt} onChange={(e) => setEventoAt(e.target.value)} style={{ ...entrada, colorScheme: 'dark' }} data-anuncio-evento />
          <p style={ayuda}>Si la pones, cada quien lee «faltan 25 minutos» en vez de una hora escrita, y el anuncio no envejece aunque viva cuatro horas.</p>
        </Campo>

        <button type="button" onClick={publicar} disabled={enviando} className="btn-primary w-full py-3.5 text-[15px] tracking-[0.06em]" data-anuncio-publicar>
          {enviando ? 'PUBLICANDO…' : 'PUBLICAR ANUNCIO'}
        </button>
        <p style={{ ...ayuda, textAlign: 'center', marginTop: -6 }}>Publicar reemplaza al anuncio anterior, y le sale de nuevo a todo el mundo: es otro anuncio.</p>

        <div style={{ marginTop: 10 }}>
          <p style={rotulo}>Los que se han puesto</p>
          {historial.length === 0 ? (
            <p style={ayuda}>Todavía no has puesto ninguno.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 10 }}>
              {historial.map((h) => <LineaHistorial key={h.id} a={h} />)}
            </div>
          )}
        </div>
      </div>
    </Marco>
  );
}

const CHAPAS = {
  activo: { label: 'Saliendo ahora', tinta: COLOR.brassInk, fondo: COLOR.brass, borde: 'transparent' },
  programado: { label: 'Programado', tinta: COLOR.ink, fondo: 'transparent', borde: COLOR.line },
  vencido: { label: 'Vencido', tinta: COLOR.dim, fondo: 'transparent', borde: COLOR.line },
  bajado: { label: 'Bajado', tinta: COLOR.dim, fondo: 'transparent', borde: COLOR.line }
};

function LineaHistorial({ a }) {
  const chapa = CHAPAS[a.estado] ?? CHAPAS.bajado;
  const cuando =
    a.estado === 'activo'
      ? (a.hasta ? `Hasta el ${fechaCorta(a.hasta)}` : 'Hasta que lo bajes')
      : a.estado === 'programado'
        ? `Empieza el ${fechaCorta(a.desde)}`
        : a.bajadoAt
          ? `Dejó de verse el ${fechaCorta(a.bajadoAt)}`
          : a.hasta ? `Venció el ${fechaCorta(a.hasta)}` : '';
  return (
    <div style={{ background: COLOR.inset, border: `1px solid ${a.estado === 'activo' ? COLOR.brass : COLOR.line}`, borderRadius: 12, padding: '11px 13px' }} data-anuncio-linea={a.estado}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: chapa.tinta, background: chapa.fondo, border: `1px solid ${chapa.borde}`, borderRadius: 999, padding: '3px 9px' }}>
          {chapa.label}
        </span>
        <span style={{ fontFamily: BODY, fontSize: 11.5, color: COLOR.dim }}>{cuando}</span>
      </div>
      <p style={{ fontFamily: SERIF, fontSize: 15.5, color: COLOR.ink, margin: '0 0 2px' }}>{a.titulo}</p>
      <p style={{ fontFamily: BODY, fontSize: 12, color: COLOR.dim, margin: 0 }}>
        {etiqueta(FORMAS, a.forma)} · {etiqueta(PUBLICOS, a.publico)} · {etiqueta(VECES, a.veces)} · puesto el {fechaCorta(a.creadoAt)}
      </p>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <p style={rotulo}>{label}</p>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function Botonera({ grupo, opciones, valor, onElegir }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {opciones.map((o) => {
        const on = o.v === valor;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onElegir(o.v)}
            data-anuncio-opcion={`${grupo}:${o.v}`}
            aria-pressed={on}
            style={{ border: on ? 'none' : `1px solid ${COLOR.line}`, background: on ? COLOR.brassBg : 'transparent', color: on ? COLOR.brassInk : COLOR.dim, borderRadius: 999, padding: '8px 14px', fontFamily: BODY, fontSize: 13, fontWeight: on ? 800 : 600, cursor: 'pointer' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const rotulo = { fontFamily: BODY, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: COLOR.brass, margin: 0 };
const ayuda = { fontFamily: BODY, fontSize: 12, fontWeight: 500, color: COLOR.dim, margin: '7px 0 0' };
const entrada = { width: '100%', background: COLOR.inset, border: `1px solid ${COLOR.line}`, borderRadius: 12, padding: '11px 13px', fontFamily: BODY, fontSize: 14, fontWeight: 500, color: COLOR.ink, outline: 'none' };
const botonBajar = { background: 'transparent', border: `1px solid ${COLOR.line}`, color: COLOR.ink, borderRadius: 12, padding: '9px 14px', fontFamily: BODY, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' };
