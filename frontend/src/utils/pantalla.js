/**
 * Pantalla completa: esconder la barra del navegador mientras se juega.
 *
 * Son dos caminos distintos y hacen falta los dos:
 *  - Instalada desde el navegador ("agregar a pantalla de inicio"), el manifest
 *    la abre sin barra. Es lo bueno, pero hay que instalarla.
 *  - En una pestaña normal, la API de pantalla completa esconde la barra al
 *    instante. Solo funciona pedida dentro de un toque del usuario, por eso se
 *    llama desde el clic del boton y no al cargar la pagina.
 */

export function esAppInstalada() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches === true ||
    window.navigator?.standalone === true
  );
}

export function pantallaCompleta() {
  if (typeof document === 'undefined' || esAppInstalada()) return;
  const el = document.documentElement;
  const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!pedir || document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const r = pedir.call(el, { navigationUI: 'hide' });
    if (r?.catch) r.catch(() => {});
  } catch {
    // Algunos navegadores lo niegan (iOS Safari no lo tiene). No es grave:
    // se sigue jugando con la barra puesta.
  }
  try {
    window.screen?.orientation?.lock?.('portrait')?.catch?.(() => {});
  } catch {
    // Solo Android lo permite.
  }
}

export function salirPantallaCompleta() {
  if (typeof document === 'undefined') return;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) return;
  const salir = document.exitFullscreen || document.webkitExitFullscreen;
  try {
    const r = salir?.call(document);
    if (r?.catch) r.catch(() => {});
  } catch {
    // ignorado
  }
}
