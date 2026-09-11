import { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useLupa } from '../../hooks/useLupa';
import Tile from './Tile.jsx';
import {
  DEFAULT_LAYOUT,
  placementsFor,
  computeBoardOffsets,
  anchorOffsetFor
} from '@privoytruco/domino-engine';

const GRID_SIZE = DEFAULT_LAYOUT.grid;
const CELL_SIZE = DEFAULT_LAYOUT.cell;

// Aire en cada lado para que la cadena no quede pegada a la baranda. No se le
// quita area de juego a nadie: la rejilla sigue siendo de 20x20, solo se dibuja
// un poco mas chica dentro del paño.
//
// Con 1 celda en un telefono quedaban solo 15px de aire, y medido, la cadena
// llega a la fila o columna extrema en el 51% de las jugadas: se veia pegada.
// Con 2 celdas quedan 30px en telefono y 55px en escritorio.
const MARGEN_CELDAS = 2;

// La mesa y las fichas tienen UN SOLO tamaño durante toda la mano. Se probo
// acercar la vista a donde esta la cadena, para que las fichas se vieran mas
// grandes al principio, pero el zoom cambiando en cada jugada molesta mas de lo
// que suma. Se dibuja la rejilla entera, siempre igual.
const LADO_CELDAS = GRID_SIZE + 2 * MARGEN_CELDAS;

// Las fichas de la mesa se agrandan mostrando menos paño, no agrandando la
// rejilla: la rejilla define donde caben las fichas y tocarla cambiaria las
// reglas del juego.
//
// Se ven `LADO_CELDAS / zoom` celdas.
//
// TODAS las fichas tienen que estar siempre a la vista: el usuario no quiere
// tener que adivinar donde sigue la cadena. Medido sobre 120.936 posiciones,
// con la camara siguiendo la cadena hace falta una ventana de 21,5 celdas para
// que no se salga NUNCA ni una ficha.
//
// Vuelto a medir con la rejilla de 16x16 (antes era 20x20), sobre 47.000
// posiciones de 1v1 y 47.000 de 2v2 jugadas de verdad. La cadena mas grande
// que aparecio ocupa 17,5 x 17,0 casillas:
//
//   ventana 14,3 celdas (zoom 1,40) -> 11,71% de las posiciones con algo fuera
//   ventana 16,0 celdas (zoom 1,25) ->  0,78%
//   ventana 17,9 celdas (zoom 1,116) -> 0,009%  (4 de 46.985, en 1v1)
//   ventana 18,2 celdas (zoom 1,10)  -> CERO en los dos modos
//
// El zoom baja de 1,116 a 1,10. Al enderezar la cadena hacia el centro (§88)
// se estira un poco mas: llega a 18,0 casillas donde antes llegaba a 17,5, y
// con 1,116 se salian 4 fichas de 46.985. Cero es cero.
//
// Aun asi las fichas quedan mas grandes que antes, porque la rejilla paso de
// 20x20 a 16x16: en un telefono de 375, de 29x15 a 35x17.
// Ver contexto/README.md secciones 82 y 88.
//
// ---------------------------------------------------------------------------
// SUBIDO A 1,30 (§120). Los amigos de Jonathan pidieron las fichas de la mesa
// mas grandes.
//
// La medicion vieja estaba equivocada, y por eso el numero era tan conservador:
// comparaba el ancho Y el alto de la cadena contra la MISMA ventana cuadrada.
// En un telefono la ventana no es cuadrada ni de lejos. La escala la manda el
// lado corto —el ancho—, asi que a lo alto se ven 26 celdas donde a lo ancho se
// ven 18. Una cadena alta entraba perfecto y la medicion decia que no.
//
// Y falta lo otro: la camara se corre sola. Mientras la cadena QUEPA, la
// encuadra. Y cuando ya no cabe, garantiza que se vean las DOS PUNTAS, que es
// donde se juega; lo que queda fuera es un tramo del medio, que no estorba.
//
// Medido bien, sobre 55.021 posiciones de partidas jugadas de verdad
// (`packages/domino-engine/tools/medir-zoom.mjs`), en un telefono de 375:
//
//   zoom | ficha  | la cadena entera no entra | no entran ni las PUNTAS
//   -----|--------|---------------------------|------------------------
//   1,10 | 35x17  |                    0,000% |                 0,000%
//   1,20 | 38x19  |                    0,165% |                 0,029%
//   1,30 | 41x20  |                    1,263% |                 0,327%
//   1,40 | 44x22  |                    4,611% |                 1,252%
//   1,50 | 47x24  |                   10,180% |                 3,271%
//
// 1,30 deja las fichas un 17% mas grandes y las dos puntas a la vista en el
// 99,67% de las jugadas. Para el 1,3% en que un tramo del medio se sale, estan
// los dos dedos: la lupa ya existe.
const ZOOM_FICHAS = 1.30;

// ---------------------------------------------------------------------------
// Los topes de la camara (§122)
//
// Van como FRACCION del lado corto del rectangulo de juego, no en pixeles, para
// que la ficha se vea del mismo tamaño relativo en un telefono y en una pantalla
// grande.
//
// En un telefono de 375 el lado corto son 315 px:
//   maximo 0,22 -> ficha de 69 px de alto   (Domino Legends: 78)
//   minimo 0,035 -> ficha de 11 px de alto  (Domino Legends: 13)
const ALTO_MAXIMO_FICHA = 0.22;
const ALTO_MINIMO_FICHA = 0.035;

// Cuanto sitio se reserva MAS ALLA DE LAS PUNTAS al encuadrar.
//
// No es estetica: una ficha mide dos celdas de largo, asi que la siguiente cae
// como mucho a dos celdas de una punta. Reservando eso, el iman donde se suelta
// siempre entra en pantalla.
//
// Se reserva alrededor de LAS PUNTAS y no de toda la cadena. La primera version
// dejaba 2,2 celdas por los cuatro lados de la caja entera, y con la cadena
// larga eso son casi cinco celdas de paño vacio que achicaban las fichas mas
// que antes de todo el cambio.
const ALCANCE_PUNTA = 2.0;

/** Un respiro para que la cadena no toque el borde. Esto si es estetica. */
const AIRE_CELDAS = 0.5;

/**
 * Cuanto tarda la ficha en llegar de la mano a la mesa.
 *
 * Medido en Domino Legends: ~0,3 s. Mas rapido no se ve; mas lento se siente
 * que el juego te hace esperar, que es justo lo que nos dijeron los amigos de
 * Jonathan del segundo de espera que habia en el servidor.
 */
const MS_VUELO = 300;

// Cuanto puede correrse la camara, en celdas, respecto del centro de la rejilla.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const getValidPlacementsForTile = (board, tile, side) => placementsFor(board, tile, side);

function getVisualCoords(pos, idx, boardOffsets) {
  const offset = boardOffsets[idx] || { x: 0, y: 0 };
  return {
    left: Math.min(pos.x, pos.x2) * CELL_SIZE + offset.x,
    top: Math.min(pos.y, pos.y2) * CELL_SIZE + offset.y
  };
}

function getGhostVisualCoords(opt, board) {
  const offset = anchorOffsetFor(board, opt);
  return {
    left: Math.min(opt.x, opt.x2) * CELL_SIZE + offset.x,
    top: Math.min(opt.y, opt.y2) * CELL_SIZE + offset.y
  };
}

export default function Board({
  board,
  // El rectangulo donde viven las fichas. Los asientos se sientan en los
  // bordes de la mesa y la cadena no entra ahi: por eso hace falta un margen
  // por cada lado y no solo abajo.
  margenes = { arriba: 0, derecha: 0, abajo: 0, izquierda: 0 },
  ends,
  selectedTile = null,
  onPlayTile = null,
  /**
   * De donde sale la ficha que se acaba de jugar, para que la veas volar.
   * `{ id, rect }` — `rect` en coordenadas de pantalla, o null si no se sabe
   * (jugada del rival: entonces sale del lado de su asiento).
   */
  vuelo = null,
  myTurn = false,
  lastAction = null,
  draggedTile = null,
  onSnapChange = null,
  clasePano = 'felt-verde',
  claseBaranda = 'rail-cognac'
}) {
  const containerRef = useRef(null);

  const boardOffsets = useMemo(() => {
    return computeBoardOffsets(board);
  }, [board]);

  // Seleccionar la ficha activa para placements (arrastrando o seleccionada)
  const activeTileForPlacements = useMemo(() => {
    if (draggedTile) return draggedTile.tile;
    if (selectedTile) return selectedTile.tile;
    return null;
  }, [draggedTile, selectedTile]);

  // Calcular siluetas fantasmas disponibles
  const ghostPlacements = useMemo(() => {
    if (!myTurn || !activeTileForPlacements) return [];
    
    if (!board || board.length === 0) {
      return getValidPlacementsForTile(board, activeTileForPlacements, 'first');
    }

    const placements = [];
    const leftPlacements = getValidPlacementsForTile(board, activeTileForPlacements, 'left');
    const rightPlacements = getValidPlacementsForTile(board, activeTileForPlacements, 'right');
    
    placements.push(...leftPlacements);
    placements.push(...rightPlacements);
    
    return placements;
  }, [board, activeTileForPlacements, myTurn]);

  // Centrar el tablero inicialmente
  // El tablero de 20x20 se escala para entrar entero en el paño. Antes se
  // scrolleaba, lo que en el telefono era impracticable.
  const tableroVacio = !board || board.length === 0;
  const [pano, setPano] = useState({ ancho: 0, alto: 0 });

  const medirEscala = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const ancho = el.clientWidth;
    const alto = el.clientHeight;
    if (ancho > 0 && alto > 0) {
      setPano((p) => (p.ancho === ancho && p.alto === alto ? p : { ancho, alto }));
    }
  }, []);

  // Se mide por varias vias porque ninguna alcanza sola: en el primer render el
  // ResizeObserver todavia no disparo, hay entornos donde no dispara nunca, y
  // medir en el mismo render daba el alto a medio asentar (se quedaba en 313
  // cuando el paño terminaba midiendo 792).
  useLayoutEffect(medirEscala);
  useEffect(() => {
    const id = requestAnimationFrame(medirEscala);
    return () => cancelAnimationFrame(id);
  });

  // El rectangulo de juego: el paño menos lo que ocupan los asientos.
  const anchoUtil = Math.max(pano.ancho - margenes.izquierda - margenes.derecha, 120);
  const altoUtil = Math.max(pano.alto - margenes.arriba - margenes.abajo, 120);

  // La lupa de dos dedos. Va POR ENCIMA de todo lo de arriba y no lo toca: la
  // partida se sigue dibujando igual, solo se acerca la vista mientras hay
  // dedos apoyados.
  const lupa = useLupa(containerRef);

  // La caja que ocupa la cadena dibujada, en celdas. Lleva el corrimiento de
  // los dobles, que es lo que hace que el dibujo se salga de la rejilla.
  const cajaCadena = useMemo(() => {
    if (!board || board.length === 0) return null;
    let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
    board.forEach((pos, i) => {
      const o = boardOffsets[i] ?? { x: 0, y: 0 };
      const ancho = pos.orientation === 'horizontal' ? 2 : 1;
      const alto = pos.orientation === 'horizontal' ? 1 : 2;
      const l = Math.min(pos.x, pos.x2) + o.x / CELL_SIZE;
      const t = Math.min(pos.y, pos.y2) + o.y / CELL_SIZE;
      x1 = Math.min(x1, l); x2 = Math.max(x2, l + ancho);
      y1 = Math.min(y1, t); y2 = Math.max(y2, t + alto);
    });
    // Las dos puntas jugables: si algo tiene que quedar a la vista, son estas.
    const punta = (i) => {
      const pos = board[i];
      const o = boardOffsets[i] ?? { x: 0, y: 0 };
      const ancho = pos.orientation === 'horizontal' ? 2 : 1;
      const alto = pos.orientation === 'horizontal' ? 1 : 2;
      const l = Math.min(pos.x, pos.x2) + o.x / CELL_SIZE;
      const t = Math.min(pos.y, pos.y2) + o.y / CELL_SIZE;
      return { x1: l, x2: l + ancho, y1: t, y2: t + alto, cx: l + ancho / 2, cy: t + alto / 2 };
    };
    const a = punta(0), b = punta(board.length - 1);
    return {
      x1, x2, y1, y2,
      // Caja que contiene solo las dos puntas jugables.
      px1: Math.min(a.x1, b.x1), px2: Math.max(a.x2, b.x2),
      py1: Math.min(a.y1, b.y1), py2: Math.max(a.y2, b.y2),
      puntasX: (a.cx + b.cx) / 2, puntasY: (a.cy + b.cy) / 2
    };
  }, [board, boardOffsets]);

  // -------------------------------------------------------------------------
  // LA CAMARA (§122)
  //
  // Antes la mesa tenia UN SOLO tamaño toda la mano: se dibujaba la rejilla
  // entera y las fichas salian del tamaño que salieran. Con la rejilla de 16x16
  // eso daba fichas de 20 px de alto en un telefono, y ahi se quedaban aunque
  // hubiera una sola ficha puesta y la pantalla estuviera vacia.
  //
  // Ahora la camara **encuadra la cadena**: se acerca cuando hay poco puesto y
  // se aleja a medida que crece, como una camara de verdad siguiendo la mesa.
  // Medido sobre el video de Domino Legends, que es lo que pidio Jonathan: su
  // primera ficha mide 78 px de alto y la nuestra media 20.
  //
  // El motivo por el que esto se habia descartado (§82) era que "el zoom
  // cambiando en cada jugada molesta". Se resuelve con dos cosas:
  //
  //   1. El cambio es SUAVE: el transform lleva una transicion, asi que la
  //      camara se desliza en vez de saltar.
  //   2. El encuadre deja AIRE de sobra alrededor de la cadena, asi que casi
  //      todas las jugadas caben sin mover nada y el zoom cambia poco.
  /**
   * Lo que la camara tiene que llegar a mostrar: la cadena, y el sitio donde va
   * a caer la ficha que viene, que esta pegado a las PUNTAS.
   */
  const encuadre = useMemo(() => {
    if (!cajaCadena) return null;
    return {
      x1: Math.min(cajaCadena.x1, cajaCadena.px1 - ALCANCE_PUNTA) - AIRE_CELDAS,
      x2: Math.max(cajaCadena.x2, cajaCadena.px2 + ALCANCE_PUNTA) + AIRE_CELDAS,
      y1: Math.min(cajaCadena.y1, cajaCadena.py1 - ALCANCE_PUNTA) - AIRE_CELDAS,
      y2: Math.max(cajaCadena.y2, cajaCadena.py2 + ALCANCE_PUNTA) + AIRE_CELDAS
    };
  }, [cajaCadena]);

  const centroCadenaX = encuadre ? (encuadre.x1 + encuadre.x2) / 2 : GRID_SIZE / 2;
  const centroCadenaY = encuadre ? (encuadre.y1 + encuadre.y2) / 2 : GRID_SIZE / 2;

  const escala = useMemo(() => {
    if (anchoUtil <= 0 || altoUtil <= 0) return 1;

    const menorLado = Math.min(anchoUtil, altoUtil);
    // Topes proporcionales a la pantalla: asi la ficha se ve del mismo tamaño
    // relativo en un telefono y en un escritorio.
    const maxima = (menorLado * ALTO_MAXIMO_FICHA) / CELL_SIZE;
    const minima = (menorLado * ALTO_MINIMO_FICHA) / CELL_SIZE;

    if (!cajaCadena) return maxima;

    const necesarioX = (encuadre.x2 - encuadre.x1) * CELL_SIZE;
    const necesarioY = (encuadre.y2 - encuadre.y1) * CELL_SIZE;

    const cabe = Math.min(anchoUtil / necesarioX, altoUtil / necesarioY);
    return clamp(cabe, minima, maxima);
  }, [anchoUtil, altoUtil, cajaCadena, encuadre]);

  const celdasVisiblesX = anchoUtil > 0 ? anchoUtil / (CELL_SIZE * escala) : LADO_CELDAS;
  const celdasVisiblesY = altoUtil > 0 ? altoUtil / (CELL_SIZE * escala) : LADO_CELDAS;

  // Con el encuadre siguiendo a la cadena, la camara se centra en la CADENA y no
  // en el centro de la rejilla. Antes se centraba en la rejilla porque la vista
  // era fija y la cadena siempre entraba; ahora la cadena manda.
  const centroX = centroCadenaX;
  const centroY = centroCadenaY;
  const origenX = centroX - celdasVisiblesX / 2;
  const origenY = centroY - celdasVisiblesY / 2;
  const desplazamientoX = margenes.izquierda - origenX * CELL_SIZE * escala;
  const desplazamientoY = margenes.arriba - origenY * CELL_SIZE * escala;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    medirEscala();
    window.addEventListener('resize', medirEscala);
    window.addEventListener('orientationchange', medirEscala);

    let observador = null;
    if (typeof ResizeObserver !== 'undefined') {
      observador = new ResizeObserver(medirEscala);
      observador.observe(el);
    }

    return () => {
      window.removeEventListener('resize', medirEscala);
      window.removeEventListener('orientationchange', medirEscala);
      observador?.disconnect();
    };
  }, [tableroVacio, medirEscala]);




  // Calcular y notificar snap en tiempo real
  useEffect(() => {
    if (!draggedTile || ghostPlacements.length === 0 || !onSnapChange) {
      onSnapChange?.(false, null);
      return;
    }

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const localX = (draggedTile.currentX - rect.left - desplazamientoX) / escala;
    const localY = (draggedTile.currentY - rect.top - desplazamientoY) / escala;

    let bestPlacement = null;
    let minDistance = Infinity;
    const threshold = 45 / escala; // 45 px de pantalla, sea cual sea la escala

    for (const opt of ghostPlacements) {
      const { left: tileLeft, top: tileTop } = getGhostVisualCoords(opt, board);
      const tileWidth = opt.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
      const tileHeight = opt.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;

      const centerX = tileLeft + tileWidth / 2;
      const centerY = tileTop + tileHeight / 2;

      const dist = Math.hypot(localX - centerX, localY - centerY);
      if (dist < minDistance && dist < threshold) {
        minDistance = dist;
        bestPlacement = opt;
      }
    }

    if (bestPlacement) {
      onSnapChange(true, bestPlacement);
    } else {
      onSnapChange(false, null);
    }
  }, [draggedTile, ghostPlacements, onSnapChange, board, boardOffsets, escala, desplazamientoX, desplazamientoY]);

  const renderGhostPlacements = () => {
    return ghostPlacements.map((opt, idx) => {
      const isSnappedActive = draggedTile?.isSnapped &&
        draggedTile?.activePlacement &&
        draggedTile.activePlacement.x === opt.x &&
        draggedTile.activePlacement.y === opt.y &&
        draggedTile.activePlacement.orientation === opt.orientation;

      const { left: tileLeft, top: tileTop } = getGhostVisualCoords(opt, board);
      const tileWidth = opt.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
      const tileHeight = opt.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;

      const magnetLeft = tileWidth / 2 - 12;
      const magnetTop = tileHeight / 2 - 12;

      // Determinar qué tile mostrar de forma predictiva según el arrastre o la selección
      const currentTile = draggedTile ? draggedTile.tile : (selectedTile ? selectedTile.tile : null);

      const displayTile = currentTile
        ? (opt.orientation === 'horizontal'
            ? (opt.x < opt.x2 ? [currentTile[0], currentTile[1]] : [currentTile[1], currentTile[0]])
            : (opt.y < opt.y2 ? [currentTile[0], currentTile[1]] : [currentTile[1], currentTile[0]]))
        : null;

      return (
        <div
          key={`ghost-${idx}`}
          className="absolute z-20 group"
          style={{
            left: `${tileLeft}px`,
            top: `${tileTop}px`,
            width: `${tileWidth}px`,
            height: `${tileHeight}px`,
            pointerEvents: 'none'
          }}
        >
          {/* Silueta punteada translúcida */}
          <div className="absolute inset-0 border-2 border-dashed border-domino-accent/30 bg-domino-accent/5 rounded" />

          {/* Vista previa de la ficha imantada */}
          {isSnappedActive && displayTile && (
            <div className="absolute inset-0 opacity-80 border border-domino-accent/40 rounded shadow-lg overflow-hidden scale-[0.98]">
              <Tile
                tile={displayTile}
                orientation={opt.orientation}
                size="mesa"
              />
            </div>
          )}

          {/* Círculo interactivo del Imán (🧲) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onPlayTile && onPlayTile(opt.side, opt);
            }}
            className={`absolute rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg select-none cursor-pointer transition-all duration-150 pointer-events-auto z-30 hover:scale-115 active:scale-90 ${
              isSnappedActive
                ? 'bg-domino-accent text-domino-dark border border-white shadow-amber-500/50 scale-125'
                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-blue-500/50 animate-pulse'
            }`}
            style={{
              left: `${magnetLeft}px`,
              top: `${magnetTop}px`,
              width: '24px',
              height: '24px'
            }}
            title="Imán de conexión"
          >
            🧲
          </div>
        </div>
      );
    });
  };

  // -------------------------------------------------------------------------
  // EL VUELO DE LA FICHA (§122)
  //
  // Antes la ficha aparecia de golpe en su sitio, con un rebote. Ahora **sale de
  // donde estaba** —tu mano, o el lado del rival— y viaja hasta la mesa
  // creciendo por el camino, que es lo que hace Domino Legends y lo que hace que
  // la jugada se entienda sin mirar dos veces.
  //
  // Todo esto va ANTES del `return` del tablero vacio. Los hooks no pueden
  // quedar detras de un `return`: con la mesa sin fichas corrian menos hooks que
  // con la mesa puesta, y React se caia con "Rendered more hooks than during the
  // previous render" en cuanto entraba la primera ficha.
  const [volando, setVolando] = useState(null);
  const ultimoVuelo = useRef(null);

  useLayoutEffect(() => {
    if (!vuelo || vuelo.id === ultimoVuelo.current) return;

    // Cual de las fichas de la mesa es la que se acaba de jugar: solo puede ser
    // una de las dos puntas, y tiene que coincidir con la ficha jugada.
    //
    // Ojo con el orden: `vuelo` se anota ANTES de que el servidor conteste, asi
    // que la primera vez que corre esto la mesa todavia no tiene la ficha. Por
    // eso el vuelo se da por consumido **solo cuando ya se encontro**, y por eso
    // `board` esta en las dependencias: al llegar el estado nuevo vuelve a
    // correr, y ahi si la encuentra.
    const mismaFicha = (a, b) =>
      a && b && ((a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]));
    const indice = [0, board.length - 1].find((i) => mismaFicha(board[i]?.tile, vuelo.tile));
    if (indice === undefined) return;

    const pano = containerRef.current;
    const nodo = pano?.querySelector(`[data-ficha-mesa="${indice}"]`);
    if (!pano || !nodo || !nodo.offsetWidth) return;

    // Todo el viaje se cuenta en coordenadas de la REJILLA, no de la pantalla.
    //
    // La ficha que vuela se dibuja dentro de la camara, al lado de las demas: el
    // destino es entonces la casilla donde va a quedar, y no hace falta adivinar
    // donde caera esa casilla en la pantalla. Si la camara se esta moviendo en
    // ese mismo momento —y se esta moviendo, porque acaba de entrar una ficha—
    // se lleva a la que vuela con ella, como a cualquier otra.
    const hasta = {
      x: nodo.offsetLeft,
      y: nodo.offsetTop,
      w: nodo.offsetWidth,
      h: nodo.offsetHeight
    };

    // Lo unico que hay que traducir es de DONDE sale, que se midio en pantalla.
    const z = lupa.escala || 1;
    const caja = pano.getBoundingClientRect();
    const aRejilla = (r) => ({
      x: ((r.left - caja.left - (lupa.x ?? 0)) / z - desplazamientoX) / escala,
      y: ((r.top - caja.top - (lupa.y ?? 0)) / z - desplazamientoY) / escala,
      w: r.width / (z * escala),
      h: r.height / (z * escala)
    });

    // Si no hay ficha de mano conocida (jugo el rival), entra desde su lado, por
    // fuera del borde de arriba de la mesa.
    const desde = vuelo.rect
      ? aRejilla(vuelo.rect)
      : { x: hasta.x, y: hasta.y - altoUtil / escala, w: hasta.w, h: Math.max(hasta.w, hasta.h) };

    // Con que CARA y en que sentido aterriza (§134).
    //
    // La ficha de la mesa no se dibuja con el orden crudo de la mano: se le da
    // vuelta segun por que punta entra (`displayTile`). Si la que vuela usa el
    // orden crudo, al llegar cambia de golpe y se ve como si la ficha se
    // volteara. Se copia lo que va a quedar puesto, tal cual.
    const puesta = board[indice];
    const caraFinal = puesta.orientation === 'horizontal'
      ? (puesta.x < puesta.x2 ? [puesta.tile[0], puesta.tile[1]] : [puesta.tile[1], puesta.tile[0]])
      : (puesta.y < puesta.y2 ? [puesta.tile[0], puesta.tile[1]] : [puesta.tile[1], puesta.tile[0]]);

    // Y cuanto tiene que GIRAR por el camino.
    //
    // En la mano la ficha esta parada; en la mesa puede quedar acostada. Antes
    // el giro pasaba de golpe al salir de la mano —el volantazo que se veia—.
    // Ahora sale con el angulo que tenia en tu mano y gira mientras viaja.
    const giroDe = (ficha, orientacion) =>
      orientacion === 'horizontal'
        ? (ficha[0] <= ficha[1] ? 0 : 180)
        : (ficha[0] <= ficha[1] ? 90 : 270);

    const enLaMano = giroDe(vuelo.tile, 'vertical');
    const enLaMesa = giroDe(caraFinal, puesta.orientation);
    // Por el camino corto: 270 grados a la derecha es 90 a la izquierda.
    let giro = ((enLaMano - enLaMesa) % 360 + 360) % 360;
    if (giro > 180) giro -= 360;

    ultimoVuelo.current = vuelo.id;
    setVolando({
      id: vuelo.id,
      indice,
      tile: caraFinal,
      orientation: puesta.orientation,
      giro,
      desde,
      hasta
    });
  }, [vuelo, board, escala, desplazamientoX, desplazamientoY, altoUtil, lupa.x, lupa.y, lupa.escala]);

  // Al terminar el viaje, la ficha de verdad ya esta en su sitio y esta se va.
  useEffect(() => {
    if (!volando) return;
    const id = setTimeout(() => setVolando(null), MS_VUELO + 40);
    return () => clearTimeout(id);
  }, [volando]);

  if (!board || board.length === 0) {
    return (
      <div className={`rail-base ${claseBaranda} flex h-full w-full flex-col rounded-none relative`}>
      <span className="rail-side rail-top" aria-hidden="true" />
      <span className="rail-side rail-bottom" aria-hidden="true" />
      <span className="rail-side rail-left" aria-hidden="true" />
      <span className="rail-side rail-right" aria-hidden="true" />
      <div
        ref={containerRef}
        className={`felt-base ${clasePano} w-full h-full relative overflow-hidden rounded-xl`}
      >
        <div
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            background:
              'radial-gradient(115% 85% at 50% 4%, rgba(255,246,220,0.14) 0%, rgba(255,246,220,0.04) 34%, rgba(0,0,0,0) 58%),' +
              'radial-gradient(135% 105% at 50% 52%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.40) 100%)'
          }}
        />
        <div
          className="camara-de-mesa relative origin-top-left"
          style={{
            width: `${GRID_SIZE * CELL_SIZE}px`,
            height: `${GRID_SIZE * CELL_SIZE}px`,
            transform: `translate(${desplazamientoX}px, ${desplazamientoY}px) scale(${escala})`
          }}
        >
          {renderGhostPlacements()}
        </div>
      </div>

      {/* El cartel del tablero vacio va FUERA de la camara.
          Dentro, se escalaba con ella: con la mesa acercada al maximo el texto
          salia gigante y cortado por los lados.

          Y NO va en el medio cuando te toca a vos (§127). Era una tarjeta con
          fondo y desenfoque justo encima de donde aparecen los imanes: Jonathan
          mando capturas con los imanes borrosos por detras del cartel, sin
          poder ver donde estaba poniendo la primera ficha. Cuando te toca, el
          aviso baja a una linea fina arriba; y en cuanto agarras una ficha
          desaparece del todo, que a esa altura ya sabes lo que estas haciendo. */}
      {!myTurn && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-5 py-3 text-center text-sm italic text-domino-cream/60 backdrop-blur-sm">
            Esperando que comience la ronda...
          </div>
        </div>
      )}

      {myTurn && !selectedTile && !draggedTile && (
        <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center px-6">
          <span className="rounded-full border border-domino-accent/30 bg-black/70 px-3 py-1.5 text-center text-[11px] font-semibold text-domino-cream/80">
            Sos el primero: poné una ficha en el centro
          </span>
        </div>
      )}
      </div>
    );
  }



  return (
    <div className={`rail-base ${claseBaranda} flex h-full w-full flex-col rounded-none relative`}>
      <span className="rail-side rail-top" aria-hidden="true" />
      <span className="rail-side rail-bottom" aria-hidden="true" />
      <span className="rail-side rail-left" aria-hidden="true" />
      <span className="rail-side rail-right" aria-hidden="true" />
    <div
      ref={containerRef}
      className={`felt-base ${clasePano} w-full h-full relative overflow-hidden rounded-xl select-none`}
      style={{ touchAction: 'none' }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background:
            'radial-gradient(115% 85% at 50% 4%, rgba(255,246,220,0.14) 0%, rgba(255,246,220,0.04) 34%, rgba(0,0,0,0) 58%),' +
            'radial-gradient(135% 105% at 50% 52%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.40) 100%)'
        }}
      />
      <div style={lupa.estilo}>
      <div
        className="camara-de-mesa relative origin-top-left"
        style={{
          width: `${GRID_SIZE * CELL_SIZE}px`,
          height: `${GRID_SIZE * CELL_SIZE}px`,
          transform: `translate(${desplazamientoX}px, ${desplazamientoY}px) scale(${escala})`
        }}
      >
        {/* Renderizar Fichas Colocadas */}
        {board.map((pos, i) => {
          const tile = pos.tile;
          const isNewest = lastAction && lastAction.type === 'play' &&
            ((lastAction.tile[0] === tile[0] && lastAction.tile[1] === tile[1]) ||
             (lastAction.tile[0] === tile[1] && lastAction.tile[1] === tile[0])) &&
            (i === 0 || i === board.length - 1);

          const displayTile = pos.orientation === 'horizontal'
            ? (pos.x < pos.x2 ? [tile[0], tile[1]] : [tile[1], tile[0]])
            : (pos.y < pos.y2 ? [tile[0], tile[1]] : [tile[1], tile[0]]);

          const { left, top } = getVisualCoords(pos, i, boardOffsets);

          // La ficha recien puesta se esconde mientras su copia va volando: si
          // no, se verian las dos a la vez, una quieta y otra viajando.
          const esLaQueVuela = volando != null && volando.indice === i;

          return (
            <div
              key={`tile-${i}`}
              data-ficha-mesa={i}
              // La transicion de sitio es para el DESTRANQUE: cuando la cadena
              // se vuelve a trazar, las fichas se deslizan a su lugar nuevo en
              // vez de saltar. En el juego normal no se nota, porque una ficha
              // ya puesta nunca se mueve.
              // Ya no lleva `tile-placed`: ese rebote empezaba en `scale(0.3)`
              // con opacidad 0, asi que despues de aterrizar la ficha
              // desaparecia y volvia a aparecer de un salto. El viaje ES la
              // animacion de poner la ficha; lo unico que queda es dejarla por
              // encima de sus vecinas.
              className={`absolute ficha-de-mesa ${isNewest ? 'z-10' : ''}`}
              style={{ left: `${left}px`, top: `${top}px`, visibility: esLaQueVuela ? 'hidden' : undefined }}
            >
              <Tile
                tile={displayTile}
                orientation={pos.orientation}
                size="mesa"
                isNewest={isNewest}
              />
            </div>
          );
        })}

        {/* Renderizar Siluetas e Imanes */}
        {renderGhostPlacements()}

        {/* La ficha viajando de la mano a su casilla. */}
        {volando && (
          <FichaEnVuelo
            key={volando.id}
            tile={volando.tile}
            orientation={volando.orientation}
            desde={volando.desde}
            hasta={volando.hasta}
            giro={volando.giro}
          />
        )}
      </div>
      </div>
    </div>
    </div>
  );
}

/**
 * La ficha que va de la mano a su sitio en la mesa.
 *
 * Se dibuja **ya en su destino**, del tamaño que le toca ahi, y una animacion de
 * CSS la trae desde donde estaba en la mano: empieza corrida y chiquita, y llega
 * a su sitio creciendo.
 *
 * Va con `@keyframes` y no con una transicion en dos renders. La transicion
 * necesitaba un `requestAnimationFrame` para tener de donde animar, y `rAF` no
 * corre cuando la pestaña no se esta dibujando: la ficha se quedaba clavada
 * sobre la mano y desaparecia sin viajar. Asi ademas, si el sistema tiene el
 * movimiento apagado, la animacion no corre y la ficha simplemente esta donde
 * tiene que estar.
 */
function FichaEnVuelo({ tile, orientation, desde, hasta, giro = 0 }) {
  return (
    <div
      className="ficha-en-vuelo pointer-events-none absolute z-30 origin-top-left"
      style={{
        left: `${hasta.x}px`,
        top: `${hasta.y}px`,
        width: `${hasta.w}px`,
        height: `${hasta.h}px`,
        '--vuelo-dx': `${desde.x - hasta.x}px`,
        '--vuelo-dy': `${desde.y - hasta.y}px`,
        // Se comparan los lados LARGOS, no los anchos.
        //
        // La ficha vuela ya girada como va a quedar, asi que si sale de la mano
        // (siempre parada) hacia una casilla acostada, comparar ancho con ancho
        // la hacia despegar al doble de grande y encoger por el camino. Con el
        // lado largo despega exactamente del tamaño que tenia en la mano.
        '--vuelo-escala': desde.h / Math.max(hasta.w, hasta.h, 1),
        '--vuelo-ms': `${MS_VUELO}ms`,
        filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))'
      }}
    >
      {/* El giro va en una capa APARTE, y no en la de afuera.
          La de afuera se mueve y se escala desde su esquina de arriba a la
          izquierda, que es lo que hace que las cuentas de sitio sean simples.
          Girar desde esa misma esquina abriria la ficha como una puerta: el
          giro necesita el centro. */}
      <div
        className="ficha-en-vuelo-giro h-full w-full"
        style={{ '--vuelo-giro': `${giro}deg`, '--vuelo-ms': `${MS_VUELO}ms` }}
      >
        <Tile tile={tile} orientation={orientation} ancho={hasta.w} />
      </div>
    </div>
  );
}
