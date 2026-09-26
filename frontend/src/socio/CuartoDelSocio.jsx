import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * EL CUARTO DEL SOCIO (seccion 201): Config, Guardianes y Disputas, las tres
 * detras de la misma llave del buzon (`/config?llave=...`). El domino no tiene
 * cuentas todavia, asi que la llave es la puerta; queda guardada en el telefono
 * para no escribirla cada vez.
 *
 * Reglas de la casa que se respetan aqui:
 * - TODA perilla con su boton Guardar (ficha 8.1). Nada se guarda solo.
 * - Letras grandes en lo importante, nada de grises flojos.
 */
const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

export function llaveDelSocio() {
  const url = new URLSearchParams(window.location.search).get('llave');
  try {
    if (url) localStorage.setItem('domino-buzon-llave', url);
    return url || localStorage.getItem('domino-buzon-llave') || '';
  } catch {
    return url || '';
  }
}

const fecha = (iso) => new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** La barra de los tres cuartos del socio, con la llave puesta en el enlace. */
export function BarraDelSocio({ llave }) {
  const { pathname } = useLocation();
  const cuartos = [
    { a: '/buzon', texto: 'BUZÓN' },
    { a: '/config', texto: 'CONFIG' },
    { a: '/guardianes', texto: 'GUARDIANES' },
    { a: '/disputas', texto: 'DISPUTAS' },
    { a: '/socio-torneos', texto: 'TORNEOS' }
  ];
  return (
    <nav className="mb-4 flex flex-wrap gap-1.5">
      {cuartos.map((c) => (
        <Link
          key={c.a}
          to={`${c.a}?llave=${encodeURIComponent(llave)}`}
          className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.12em] ${
            pathname === c.a ? 'border-domino-accent bg-domino-accent text-domino-dark' : 'border-domino-accent/45 bg-black/30 text-domino-accent'
          }`}
        >
          {c.texto}
        </Link>
      ))}
    </nav>
  );
}

export function Marco({ titulo, llave, error, children }) {
  return (
    <div className="min-h-[100dvh] bg-[#08120c] px-5 pb-10 pt-5 text-domino-cream">
      <div className="mx-auto max-w-md">
        <h1 className="text-[26px] font-bold text-domino-accent" style={{ fontFamily: SERIF }}>{titulo}</h1>
        <BarraDelSocio llave={llave} />
        {error && <p className="mb-3 text-sm font-semibold text-red-300">{error}{!llave && ' · falta la llave (?llave=...)'}</p>}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ CONFIG */

export default function Config() {
  const [llave] = useState(llaveDelSocio);
  const [perillas, setPerillas] = useState(null);
  const [error, setError] = useState(null);
  const [borrador, setBorrador] = useState({});
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/config?llave=${encodeURIComponent(llave)}`);
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'No se pudo leer'); return; }
      setPerillas(j.perillas);
      setError(null);
    } catch {
      setError('No se pudo leer la config');
    }
  }, [llave]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (p, valor) => {
    const r = await fetch(`${API}/config?llave=${encodeURIComponent(llave)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clave: p.clave, valor })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setAviso(j.error || 'No se pudo guardar'); return; }
    setAviso(`${p.nombre}: guardado.`);
    setBorrador((b) => ({ ...b, [p.clave]: undefined }));
    cargar();
  };

  const grupos = [...new Set((perillas ?? []).map((p) => p.grupo))];

  return (
    <Marco titulo="Las perillas" llave={llave} error={error}>
      {aviso && <p className="mb-3 rounded-lg border border-domino-accent/40 bg-domino-accent/10 px-3 py-2 text-[12.5px] font-bold text-domino-accent">{aviso}</p>}
      {perillas && grupos.map((g) => (
        <section key={g} className="mb-5">
          <h2 className="mb-2 text-[10px] font-extrabold tracking-[0.25em] text-domino-accent">{g.toUpperCase()}</h2>
          {perillas.filter((p) => p.grupo === g).map((p) => (
            <Perilla
              key={p.clave}
              perilla={p}
              borrador={borrador[p.clave]}
              onCambiar={(v) => setBorrador((b) => ({ ...b, [p.clave]: v }))}
              onGuardar={(v) => guardar(p, v)}
            />
          ))}
        </section>
      ))}
    </Marco>
  );
}

function Perilla({ perilla, borrador, onCambiar, onGuardar }) {
  const esSiNo = perilla.tipo === 'si-no';
  const enPantalla = (v) => (perilla.tipo === 'segundos' ? v / 1000 : v);
  const aGuardar = (v) => (perilla.tipo === 'segundos' ? Math.round(v * 1000) : v);
  const unidad = perilla.tipo === 'segundos' ? 's' : perilla.tipo === 'minutos' ? 'min' : '';
  const actual = enPantalla(perilla.valor);
  const escrito = borrador === undefined ? String(actual) : borrador;
  const cambio = !esSiNo && String(actual) !== String(escrito).trim() && String(escrito).trim() !== '';

  return (
    <div className="mb-2 rounded-xl border border-domino-accent/25 bg-black/30 px-3 py-2.5" data-perilla={perilla.clave}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold leading-tight">{perilla.nombre}</p>
          <p className="mt-0.5 text-[11.5px] font-medium leading-snug text-domino-cream/70">{perilla.ayuda}</p>
        </div>
        {esSiNo ? (
          <button
            type="button"
            onClick={() => onGuardar(!perilla.valor)}
            data-guardar={perilla.clave}
            className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-black tracking-[0.12em] ${
              perilla.valor ? 'border-domino-accent bg-domino-accent text-domino-dark' : 'border-domino-accent/45 bg-black/40 text-domino-accent'
            }`}
          >
            {perilla.valor ? 'PRENDIDA' : 'APAGADA'}
          </button>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5">
            <input
              value={escrito}
              onChange={(e) => onCambiar(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              data-valor={perilla.clave}
              className="w-16 rounded-lg border border-domino-accent/40 bg-black/50 px-2 py-2 text-center text-[15px] font-extrabold text-domino-cream outline-none"
            />
            <span className="text-[11px] font-bold text-domino-cream/60">{unidad}</span>
          </span>
        )}
      </div>
      {cambio && (
        <button
          type="button"
          onClick={() => onGuardar(aGuardar(Number(escrito)))}
          data-guardar={perilla.clave}
          className="btn-primary mt-2 w-full py-2 text-[12px] tracking-[0.15em]"
        >
          GUARDAR
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- GUARDIANES */

export function Guardianes() {
  const [llave] = useState(llaveDelSocio);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const r = await fetch(`${API}/config/guardianes?llave=${encodeURIComponent(llave)}`);
        const j = await r.json();
        if (!vivo) return;
        if (!r.ok) { setError(j.error || 'No se pudo leer'); return; }
        setDatos(j); setError(null);
      } catch {
        if (vivo) setError('No se pudo leer');
      }
    };
    cargar();
    const id = setInterval(cargar, 15000);
    return () => { vivo = false; clearInterval(id); };
  }, [llave]);

  return (
    <Marco titulo="Los guardianes" llave={llave} error={error}>
      {datos && (
        <>
          <p className="mb-3 text-[12px] font-semibold text-domino-cream/70">
            Vigilando: {datos.palabras.join(' · ')}
          </p>
          {datos.alarmas.length === 0 ? (
            <p className="rounded-xl border border-domino-accent/20 bg-black/30 px-3 py-3 text-[13px] font-semibold text-domino-cream/70">
              Todo tranquilo. Ninguna alarma desde que arrancó el servidor.
            </p>
          ) : (
            <ul>
              {datos.alarmas.map((a) => (
                <li key={`${a.motivo}-${a.cuando}`} className="mb-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5">
                  <p className="text-[13.5px] font-extrabold text-red-200">{a.titulo}</p>
                  <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-domino-cream/85">{a.detalle}</p>
                  <p className="mt-1 text-[10px] font-bold tracking-[0.12em] text-domino-cream/50">{fecha(a.cuando)}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Marco>
  );
}

/* --------------------------------------------------------------- DISPUTAS */

export function Disputas() {
  const [llave] = useState(llaveDelSocio);
  const [partidas, setPartidas] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [aMano, setAMano] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/config/libretas?llave=${encodeURIComponent(llave)}`);
        const j = await r.json();
        if (!r.ok) { setError(j.error || 'No se pudo leer'); return; }
        setPartidas(j.partidas); setError(null);
      } catch {
        setError('No se pudo leer');
      }
    })();
  }, [llave]);

  // El enlace del buzon trae la mesa: se abre sola.
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get('mesa');
    if (pedida && !abierta) abrir(pedida);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = async (code) => {
    const r = await fetch(`${API}/config/libreta/${code}?llave=${encodeURIComponent(llave)}`);
    const j = await r.json();
    if (!r.ok) { setAviso(j.error || 'No se pudo abrir'); return; }
    setAbierta(j);
  };

  const copiar = async () => {
    if (!abierta) return;
    try {
      await navigator.clipboard.writeText(abierta.reporte);
      setAviso('Reporte copiado. Pégalo en el chat.');
    } catch {
      setAMano(abierta.reporte);
    }
  };

  return (
    <Marco titulo="Las disputas" llave={llave} error={error}>
      <p className="mb-3 text-[12px] font-semibold text-domino-cream/70">
        La libreta de las últimas partidas: quién se sentó, cada ficha, cada pase y cada caída de conexión.
      </p>
      {aviso && <p className="mb-2 text-[12px] font-bold text-domino-accent">{aviso}</p>}

      {abierta ? (
        <>
          <button type="button" onClick={() => { setAbierta(null); setAMano(null); }} className="mb-2 text-[12px] font-bold text-domino-accent">‹ Volver a la lista</button>
          <button type="button" onClick={copiar} data-copiar-reporte className="btn-primary mb-3 w-full py-2.5 text-[12px] tracking-[0.15em]">COPIAR EL REPORTE</button>
          {aMano && <textarea readOnly value={aMano} rows={10} onFocus={(e) => e.target.select()} className="mb-3 w-full rounded-xl border border-domino-accent/30 bg-black/40 p-2 text-[11px] text-domino-cream" />}
          <pre className="whitespace-pre-wrap rounded-xl border border-domino-accent/25 bg-black/40 p-3 text-[11.5px] leading-relaxed text-domino-cream/90">{abierta.reporte}</pre>
        </>
      ) : (
        <ul>
          {partidas?.length === 0 && <li className="text-[13px] font-semibold text-domino-cream/60">Ninguna partida todavía.</li>}
          {partidas?.map((p) => (
            <li key={p.code}>
              <button type="button" onClick={() => abrir(p.code)} data-libreta={p.code} className="mb-2 w-full rounded-xl border border-domino-accent/25 bg-black/30 px-3 py-2.5 text-left">
                <span className="text-[14px] font-extrabold tracking-[0.12em] text-domino-accent" style={{ fontFamily: SERIF }}>{p.code}</span>
                <span className="ml-2 text-[12.5px] font-bold">{p.jugadores.join(' · ')}</span>
                <span className="mt-0.5 block text-[11px] font-semibold text-domino-cream/60">
                  {p.modo === '1v1' ? '1 vs 1' : '2 vs 2'} · {p.modalidad} · a {p.puntos} · {p.personas} {p.personas === 1 ? 'persona' : 'personas'} · {p.sucesos} anotaciones · {fecha(p.empezoEn)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Marco>
  );
}
