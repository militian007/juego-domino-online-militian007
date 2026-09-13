/**
 * El iman: la marca que dice "aqui cabe tu ficha".
 *
 * Antes era un circulo azul electrico con un emoji, y era lo unico en la mesa
 * que no era verde, madera ni oro. Ahora es una pieza de bronce, generada con
 * IA (regla 1.1: nada dibujado a mano) y recortada a 128 px.
 *
 * Hay tres piezas para elegir, y mientras se decide, la eleccion vive en el
 * navegador: `?iman=tachuela|punto|sello` en la URL la fija, y despues se
 * recuerda en localStorage. Cuando Raul y Jonathan elijan una, las otras dos
 * se van y este interruptor tambien.
 */
export const IMANES = {
  tachuela: { src: '/imanes/tachuela.webp', tamano: 30 },
  punto: { src: '/imanes/punto.webp', tamano: 26 },
  sello: { src: '/imanes/sello.webp', tamano: 32 }
};

const LLAVE = 'domino-iman';
const POR_DEFECTO = 'tachuela';

export function imanElegido() {
  try {
    const pedido = new URLSearchParams(window.location.search).get('iman');
    if (pedido && IMANES[pedido]) {
      localStorage.setItem(LLAVE, pedido);
      return pedido;
    }
    const guardado = localStorage.getItem(LLAVE);
    return IMANES[guardado] ? guardado : POR_DEFECTO;
  } catch {
    return POR_DEFECTO;
  }
}

export default function Iman({ activo = false, onClick, style }) {
  const pieza = IMANES[imanElegido()];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Poner la ficha aqui"
      className={`iman ${activo ? 'iman-activo' : ''}`}
      style={{ width: pieza.tamano, height: pieza.tamano, ...style }}
    >
      <img src={pieza.src} alt="" draggable={false} className="h-full w-full select-none" />
    </button>
  );
}
