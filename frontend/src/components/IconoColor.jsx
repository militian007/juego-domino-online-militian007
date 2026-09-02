import { ICONOS } from './iconosColor.js';

/**
 * Un icono a color del set Fluent Emoji de Microsoft.
 *
 * No se dibuja nada aqui: el cuerpo del SVG sale tal cual del paquete
 * `@iconify-json/fluent-emoji-flat` (ver `tools/extraer-iconos.cjs`). Regla de
 * oro del proyecto, CLAUDE.md 1.1: iconos de libreria, nunca a mano.
 */
export default function IconoColor({ nombre, tamano = 24, className = '' }) {
  const ic = ICONOS[nombre];
  if (!ic) return null;
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox={`0 0 ${ic.w} ${ic.h}`}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ic.body }}
    />
  );
}
