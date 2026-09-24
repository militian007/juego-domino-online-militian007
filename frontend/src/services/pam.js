/**
 * LA PUERTA DEL CLUB, del lado del teléfono (seccion 203).
 *
 * El jugador llega de privoytruco.com con una FICHA de un solo uso en la URL:
 * el lanzador del club la manda como `?launchToken=...&moneda=VES`
 * (`urlDeLanzamiento` en el truco). Se acepta tambien `?ficha=` a mano. Se canjea UNA vez, se guarda la llave del domino como
 * cualquier sesion, y se limpia la URL (una ficha en la barra se comparte por
 * WhatsApp sin querer).
 *
 * Si no hay ficha, el domino sigue como siempre: identidad ligera.
 */
const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const REBOTES = {
  FICHA_MALA: 'Ese enlace ya se usó o venció. Vuelve a entrar desde privoytruco.com.',
  BLOQUEADO: 'Tu cuenta está bloqueada en el club.',
  SIN_PAM: 'El dominó todavía no está conectado al club.',
  PAM_CAIDA: 'El club no responde ahorita. Intenta en un momento.',
  DATO_MALO: 'Ese enlace no sirve.'
};

let cacheModo = null;

/** Con que cuentas corre el domino: `pam` (las del club) o `propio`. */
export async function comoSeEntra() {
  if (cacheModo) return cacheModo;
  try {
    const r = await fetch(`${API}/pam`);
    cacheModo = await r.json();
  } catch {
    cacheModo = { modo: 'propio', club: 'https://privoytruco.com' };
  }
  return cacheModo;
}

const fichaDe = (params) => params.get('launchToken') || params.get('ficha');
export const hayFichaEnLaUrl = () => Boolean(fichaDe(new URLSearchParams(window.location.search)));

/**
 * Canjea la ficha si la hay. Devuelve `{ ok }`, `{ error }` o null si no habia
 * nada que canjear.
 */
export async function canjearLaFicha() {
  const url = new URL(window.location.href);
  const ficha = fichaDe(url.searchParams);
  if (!ficha) return null;
  // Se limpia YA, pase lo que pase: la ficha es de un solo uso.
  url.searchParams.delete('launchToken');
  url.searchParams.delete('ficha');
  url.searchParams.delete('moneda');
  window.history.replaceState({}, '', url.toString());
  try {
    const r = await fetch(`${API}/pam/entrar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ launchToken: ficha })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: REBOTES[j.error] ?? 'No se pudo entrar con tu cuenta del club.' };
    try {
      localStorage.setItem('token', j.token);
      localStorage.setItem('user', JSON.stringify(j.user));
    } catch {
      // Sin almacenamiento la sesion no dura, pero la partida de ahorita si.
    }
    return { ok: true, user: j.user, saldo: j.saldo, moneda: j.moneda };
  } catch {
    return { error: REBOTES.PAM_CAIDA };
  }
}
