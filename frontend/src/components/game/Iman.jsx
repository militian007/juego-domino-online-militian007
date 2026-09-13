/**
 * El iman: la casilla donde cabe tu ficha, avisando.
 *
 * Primero fue un circulo azul con un emoji; despues tres piezas de bronce
 * (seccion 153), que Raul tumbo porque una pieza encima del paño lo contamina;
 * despues tres efectos para elegir (seccion 159). Raul eligio este: la silueta
 * punteada de la casilla se enciende y se apaga despacio, en oro. Sin ninguna
 * imagen. La silueta entera recibe el toque, y cuando la ficha arrastrada ya
 * esta imantada se planta en oro solido.
 *
 * Desde la seccion 169 hay dos clases de casilla: la SUGERIDA (la que sigue
 * derecho) respira, y las demas opciones se ven apagadas, quietas, pero se
 * tocan igual: la gente elige hacia donde dobla la culebra.
 */
export default function Iman({ activo = false, sugerida = true, onClick }) {
  const clase = activo ? 'iman-activo' : sugerida ? 'iman-respira' : 'iman-opcion';
  return (
    <div
      className={`iman-slot ${clase}`}
      onClick={onClick}
      role="button"
      aria-label="Poner la ficha aqui"
    />
  );
}
