/**
 * El iman: la casilla donde cabe tu ficha, avisando.
 *
 * Primero fue un circulo azul con un emoji; despues tres piezas de bronce
 * (seccion 153), que Raul tumbo porque una pieza encima del paño lo contamina;
 * despues tres efectos para elegir (seccion 159). Raul eligio este: la silueta
 * punteada de la casilla se enciende y se apaga despacio, en oro. Sin ninguna
 * imagen. La silueta entera recibe el toque, y cuando la ficha arrastrada ya
 * esta imantada se planta en oro solido.
 */
export default function Iman({ activo = false, onClick }) {
  return (
    <div
      className={activo ? 'iman-slot iman-activo' : 'iman-slot iman-respira'}
      onClick={onClick}
      role="button"
      aria-label="Poner la ficha aqui"
    />
  );
}
