/* global __APP_VERSION__ */

/**
 * Sello de version. Sirve para saber de un vistazo si el navegador esta
 * corriendo el build nuevo o uno cacheado, que ya nos hizo perder un rato.
 */
export default function Version() {
  return (
    <span className="pointer-events-none fixed bottom-1 left-1.5 z-50 select-none font-mono text-[10px] tracking-wider text-white/25">
      v{__APP_VERSION__}
    </span>
  );
}
