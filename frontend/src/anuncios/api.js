/**
 * LOS ANUNCIOS DE LA CASA (seccion 214) — lo que habla con el servidor.
 *
 * Va con fetch y no con el axios de la casa a proposito: aquel manda al login
 * a quien recibe un 401, y un anuncio nunca puede sacar a nadie de la puerta.
 *
 * Las marcas del invitado viven en UNA llave del telefono con dos campos que se
 * pisan con el id de turno (la trampa 1 del truco: nada que crezca).
 */
const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const LLAVE_MARCAS = 'domino-anuncio-marcas';

function token() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

export function marcasLocales() {
  try {
    const m = JSON.parse(localStorage.getItem(LLAVE_MARCAS) || 'null');
    return {
      visto: typeof m?.visto === 'string' ? m.visto : '',
      recordado: typeof m?.recordado === 'string' ? m.recordado : ''
    };
  } catch {
    return { visto: '', recordado: '' };
  }
}

function marcarLocal(id, motivo) {
  const m = marcasLocales();
  if (motivo === 'recordatorio') m.recordado = id;
  else m.visto = id;
  try { localStorage.setItem(LLAVE_MARCAS, JSON.stringify(m)); } catch { /* sin almacenamiento */ }
}

/** Lo que le toca ver a esta persona ahora, o null. */
export async function anuncioVigente() {
  const m = marcasLocales();
  const qs = new URLSearchParams();
  if (m.visto) qs.set('visto', m.visto);
  if (m.recordado) qs.set('recordado', m.recordado);
  const t = token();
  const q = qs.toString();
  const r = await fetch(`${API}/anuncios/vigente${q ? `?${q}` : ''}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {}
  });
  if (!r.ok) return null;
  return (await r.json()).anuncio ?? null;
}

/** Se llama AL CERRARLO. Con cuenta va a la base; sin cuenta (o si falla), al telefono. */
export async function anuncioVisto(id, motivo) {
  const t = token();
  if (t) {
    try {
      const r = await fetch(`${API}/anuncios/visto`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ id, tipo: motivo })
      });
      if (r.ok) return;
    } catch { /* cae al telefono */ }
  }
  marcarLocal(id, motivo);
}

/* ------------------------------------------------------------ el socio */

async function socio(llave, metodo, ruta = '', cuerpo) {
  const r = await fetch(`${API}/socio/anuncios${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', 'x-llave': llave },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'No se pudo');
  return j;
}

export const socioAnuncios = {
  guardado: (llave) => socio(llave, 'GET'),
  historial: (llave) => socio(llave, 'GET', '/historial'),
  publicar: (llave, anuncio) => socio(llave, 'POST', '', anuncio),
  bajar: (llave) => socio(llave, 'DELETE')
};
