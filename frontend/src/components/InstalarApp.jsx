import { useEffect, useState } from 'react';

/**
 * El boton de instalar la app.
 *
 * ## Por que hace falta un boton propio
 *
 * El navegador decide solo si muestra su cartel de "instalar", y con frecuencia
 * no lo muestra: porque ya lo mostro una vez, porque no le parecio el momento,
 * o porque el aparato no lo hace. Jonathan lo dijo directo: *"cuando entro a la
 * página no me da opción... pon que siempre te dé la opción"*. Un boton propio
 * esta siempre.
 *
 * ## Los dos caminos
 *
 * - **Android y escritorio (Chrome, Edge):** el navegador avisa con
 *   `beforeinstallprompt`. Se guarda ese aviso y el boton lo dispara. Es el
 *   unico modo de abrir el cartel de instalar: no se puede llamar porque si.
 * - **iPhone (Safari):** no existe ese aviso NI forma de instalar por codigo.
 *   Se instala a mano desde Compartir. Ahi el boton explica como, que es lo
 *   unico que se puede hacer.
 *
 * Si la app ya esta instalada, el boton no aparece.
 */

const yaInstalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const esIPhone = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // El iPad moderno se hace pasar por Mac; se lo reconoce porque tiene tactil.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function InstalarApp() {
  const [aviso, setAviso] = useState(null);
  const [instalada, setInstalada] = useState(yaInstalada);
  const [comoSeHace, setComoSeHace] = useState(false);

  useEffect(() => {
    const alAvisar = (e) => {
      // Se corta el cartel automatico del navegador para poder sacarlo cuando
      // el jugador toque el boton, no cuando al navegador se le ocurra.
      e.preventDefault();
      setAviso(e);
    };
    const alInstalar = () => { setInstalada(true); setAviso(null); };

    window.addEventListener('beforeinstallprompt', alAvisar);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alAvisar);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  if (instalada) return null;

  const instalar = async () => {
    if (!aviso) { setComoSeHace(true); return; }
    aviso.prompt();
    const { outcome } = await aviso.userChoice;
    // El aviso sirve una sola vez: si no lo acepto, el navegador manda otro.
    setAviso(null);
    if (outcome === 'accepted') setInstalada(true);
  };

  return (
    <>
      <button
        onClick={instalar}
        className="flex items-center gap-1.5 rounded-full border border-domino-accent/40 bg-black/70 px-3 py-2 text-[10px] font-semibold tracking-wider text-domino-cream shadow-lg backdrop-blur-sm transition hover:border-domino-accent hover:bg-black/85 sm:text-xs"
      >
        <span aria-hidden="true">⬇</span>
        APP
      </button>

      {comoSeHace && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setComoSeHace(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-domino-accent/35 bg-domino-dark p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl" aria-hidden="true">📲</div>
            <h2 className="mt-3 text-lg font-semibold text-domino-cream">Instalar el dominó</h2>

            {esIPhone() ? (
              <ol className="mt-4 space-y-2 text-left text-sm leading-relaxed text-domino-cream/75">
                <li>1. Tocá el botón <b className="text-domino-accent">Compartir</b> de Safari, el cuadradito con la flecha hacia arriba.</li>
                <li>2. Bajá y elegí <b className="text-domino-accent">Añadir a pantalla de inicio</b>.</li>
                <li>3. Tocá <b className="text-domino-accent">Añadir</b>. Ahí vas a ver el icono.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-left text-sm leading-relaxed text-domino-cream/75">
                <li>1. Abrí el menú del navegador, los <b className="text-domino-accent">tres puntitos</b> de arriba.</li>
                <li>2. Elegí <b className="text-domino-accent">Instalar aplicación</b> o <b className="text-domino-accent">Añadir a pantalla de inicio</b>.</li>
                <li>3. Confirmá. Ahí vas a ver el icono.</li>
              </ol>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-domino-cream/45">
              Si ya la tenías instalada de antes, borrala y volvé a instalarla: el icono
              viejo se queda guardado.
            </p>

            <button
              onClick={() => setComoSeHace(false)}
              className="mt-5 w-full rounded-lg bg-domino-accent px-4 py-2.5 text-sm font-semibold text-black"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
