import Tile from './Tile.jsx';

/**
 * El iman: como se señala en el paño donde cabe tu ficha.
 *
 * Primero fue un circulo azul con un emoji. Despues, tres piezas de bronce
 * generadas con IA (seccion 153). Raul las vio en el telefono y las tumbo: una
 * pieza encima del paño lo contamina. Lo que va ahora son EFECTOS sobre la
 * propia silueta de la casilla, sin ninguna imagen: la casilla es la que avisa.
 *
 * Tres efectos para elegir, y mientras se decide la eleccion vive en el
 * navegador (`?iman=respira|fantasma|onda` en la URL, y queda guardada):
 *
 * - respira: la silueta punteada se enciende y se apaga despacio, en oro.
 * - fantasma: tu ficha, traslucida, flotando en la casilla donde caeria.
 * - onda: un anillo de oro que nace en el centro de la casilla y se abre.
 *
 * Toda la silueta recibe el toque. Cuando la ficha arrastrada ya esta imantada
 * la silueta se planta en oro solido, en los tres efectos.
 */
export const EFECTOS = {
  respira: 'La silueta respira',
  fantasma: 'La ficha fantasma',
  onda: 'La onda en el paño'
};

const LLAVE = 'domino-iman';
const POR_DEFECTO = 'respira';

export function imanElegido() {
  try {
    const pedido = new URLSearchParams(window.location.search).get('iman');
    if (pedido && EFECTOS[pedido]) {
      localStorage.setItem(LLAVE, pedido);
      return pedido;
    }
    const guardado = localStorage.getItem(LLAVE);
    return EFECTOS[guardado] ? guardado : POR_DEFECTO;
  } catch {
    return POR_DEFECTO;
  }
}

export default function Iman({ efecto = POR_DEFECTO, activo = false, tile = null, orientation, onClick }) {
  const clase = activo ? 'iman-slot iman-activo' : `iman-slot iman-${efecto}`;
  return (
    <>
      <div className={clase} onClick={onClick} role="button" aria-label="Poner la ficha aqui" />
      {efecto === 'fantasma' && tile && !activo && (
        <div className="iman-fantasma-ficha" aria-hidden="true">
          <Tile tile={tile} orientation={orientation} size="mesa" />
        </div>
      )}
      {efecto === 'onda' && !activo && <span className="iman-onda" aria-hidden="true" />}
    </>
  );
}
