import { useCallback, useEffect, useState } from 'react';
import { BarraDelSocio } from '../socio/CuartoDelSocio.jsx';

/**
 * EL BUZON, DEL LADO DEL SOCIO (seccion 200, copiado de Operaciones → Buzon
 * del truco): todo lo que la gente dejo, con «Copiar lo nuevo» (lo que cayo
 * despues de la ultima copia; la fecha la recuerda el servidor), «Copiar
 * todo» y «Vaciar». El texto copiado se pega en el chat de Claude.
 *
 * Se entra por /buzon?llave=... (la llave es `DOMINO_BUZON_LLAVE` del
 * servidor): el domino no tiene cuentas todavia. La llave queda guardada en
 * el telefono para no escribirla cada vez.
 */
const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

const fecha = (iso) => new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function textoDelBuzon(notas, titulo) {
  const hoy = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const lineas = [`BUZÓN dominó · ${hoy} · ${notas.length} ${notas.length === 1 ? 'nota' : 'notas'} (${titulo})`, ''];
  for (const n of notas) {
    lineas.push(`[${n.tipo === 'idea' ? 'IDEA' : 'FALLA'}] ${n.username} · ${fecha(n.creadoEn)}${n.pantalla ? ` · en ${n.pantalla}` : ''}`);
    lineas.push(n.texto);
    lineas.push('');
  }
  return `${lineas.join('\n').trimEnd()}\n`;
}

function llaveGuardada() {
  const url = new URLSearchParams(window.location.search).get('llave');
  try {
    if (url) localStorage.setItem('domino-buzon-llave', url);
    return url || localStorage.getItem('domino-buzon-llave') || '';
  } catch {
    return url || '';
  }
}

export default function BuzonDelSocio() {
  const [llave] = useState(llaveGuardada);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [aMano, setAMano] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/buzon?llave=${encodeURIComponent(llave)}`);
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'No se pudo leer'); return; }
      setDatos(j); setError(null);
    } catch {
      setError('No se pudo leer el buzón');
    }
  }, [llave]);

  useEffect(() => { cargar(); }, [cargar]);

  const copiar = async (cuales, titulo) => {
    const texto = textoDelBuzon(cuales, titulo);
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(`Copiadas ${cuales.length} ${cuales.length === 1 ? 'nota' : 'notas'}. Pégalas en el chat.`);
    } catch {
      setAMano(texto);
    }
    await fetch(`${API}/buzon/copiar?llave=${encodeURIComponent(llave)}`, { method: 'POST' });
    cargar();
  };

  const vaciar = async () => {
    if (!window.confirm('¿Vaciar el buzón? Se borra todo.')) return;
    await fetch(`${API}/buzon/vaciar?llave=${encodeURIComponent(llave)}`, { method: 'POST' });
    setAviso('Buzón vacío.');
    cargar();
  };

  const notas = datos?.notas ?? [];
  const nuevas = notas.filter((n) => !datos?.ultimaCopia || n.creadoEn > datos.ultimaCopia);

  return (
    <div className="min-h-[100dvh] bg-[#08120c] px-5 pb-8 pt-5 text-domino-cream">
      <div className="mx-auto max-w-md">
        <h1 className="text-[26px] font-bold text-domino-accent" style={{ fontFamily: SERIF }}>El buzón</h1>
        <BarraDelSocio llave={llave} />
        {error && <p className="mt-3 text-sm font-semibold text-red-300">{error}{!llave && ' · falta la llave (?llave=...)'}</p>}
        {datos && (
          <>
            <p className="mt-1 text-[12px] font-semibold text-domino-cream/60">
              {notas.length} {notas.length === 1 ? 'nota' : 'notas'} · {nuevas.length} sin copiar{datos.ultimaCopia ? ` · última copia ${fecha(datos.ultimaCopia)}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => copiar(nuevas, 'lo nuevo')} disabled={nuevas.length === 0} className="btn-primary px-4 py-2.5 text-[12px] tracking-[0.12em] disabled:opacity-40">COPIAR LO NUEVO · {nuevas.length}</button>
              <button type="button" onClick={() => copiar(notas, 'todo')} disabled={notas.length === 0} className="rounded-xl border border-domino-accent/55 bg-black/35 px-4 py-2.5 text-[12px] font-extrabold tracking-[0.12em] text-domino-accent disabled:opacity-40">COPIAR TODO</button>
              <button type="button" onClick={vaciar} disabled={notas.length === 0} className="rounded-xl border border-red-400/50 bg-black/35 px-4 py-2.5 text-[12px] font-extrabold tracking-[0.12em] text-red-300 disabled:opacity-40">VACIAR</button>
            </div>
            {aviso && <p className="mt-2 text-[12px] font-semibold text-domino-accent">{aviso}</p>}
            {aMano && (
              <textarea readOnly value={aMano} rows={8} className="mt-2 w-full rounded-xl border border-domino-accent/30 bg-black/40 p-2 text-[12px] text-domino-cream" onFocus={(e) => e.target.select()} />
            )}
            <ul className="mt-4">
              {notas.length === 0 && <li className="text-[13px] font-semibold text-domino-cream/60">Nada todavía.</li>}
              {[...notas].reverse().map((n) => (
                <li key={n.id} className={`border-b border-domino-accent/15 py-2.5 ${!datos.ultimaCopia || n.creadoEn > datos.ultimaCopia ? '' : 'opacity-60'}`}>
                  <div className="text-[10px] font-extrabold tracking-[0.15em] text-domino-accent">{n.tipo === 'idea' ? 'IDEA' : 'FALLA'} · {n.username} · {fecha(n.creadoEn)}{n.pantalla ? ` · ${n.pantalla}` : ''}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] font-medium">{n.texto}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
