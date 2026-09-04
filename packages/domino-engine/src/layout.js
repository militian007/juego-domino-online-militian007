// El tablero: 16x16 casillas.
//
// Una ficha ocupa 2 casillas y son 28 fichas: 56 casillas de fichas. Con 20x20
// habia 400, siete veces lo necesario, y esa rejilla enorme obligaba a dibujar
// las fichas chiquitas para que entrara entera en la pantalla de un telefono.
//
// 16x16 son 256 casillas. Medido jugando manos completas, la cadena mas grande
// ocupa una caja de 17x17, asi que entra. El precio esta medido y aceptado: la
// ficha trabada (tengo una que pega con la punta y no la puedo poner) sube de
// 0,030% a 0,751%, o sea una cada 133. A cambio las fichas se ven un 25% mas
// grandes, que es lo que hacia el juego incomodo en el telefono.
export const DEFAULT_LAYOUT = { grid: 16, cell: 32 };

const minX = (t) => Math.min(t.x, t.x2);
const minY = (t) => Math.min(t.y, t.y2);
const maxX = (t) => Math.max(t.x, t.x2);
const maxY = (t) => Math.max(t.y, t.y2);

function center(t, cell) {
  const half = cell / 2;
  if (t.orientation === 'horizontal') {
    return { x: minX(t) * cell + cell, y: minY(t) * cell + half };
  }
  return { x: minX(t) * cell + half, y: minY(t) * cell + cell };
}

/** Las dos casillas que ocupa una ficha. */
function celdasDe(t) {
  return [{ x: t.x, y: t.y }, { x: t.x2, y: t.y2 }];
}

/**
 * Por donde se tocan dos fichas: la casilla de cada una que pega con la otra.
 *
 * Hace falta para centrar el doble sobre la UNION y no sobre el centro de la
 * ficha vecina. Cuando la vecina ocupa dos casillas en el eje que importa
 * (dos fichas verticales al costado, por ejemplo) su centro no es la union, y
 * centrar sobre el centro deja el doble corrido media ficha.
 */
function celdaDeUnion(a, b) {
  for (const p of celdasDe(a)) {
    for (const q of celdasDe(b)) {
      if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1) return { enA: p, enB: q };
    }
  }
  return null;
}

const centroDeCelda = (c, cell) => ({ x: c.x * cell + cell / 2, y: c.y * cell + cell / 2 });

/**
 * ¿Van una detras de la otra, o una al costado de la otra?
 *
 * Dos fichas con la misma orientacion pueden estar en linea (la cadena sigue
 * derecho) o al costado (la cadena doblo). Solo en el segundo caso hay que
 * centrar el doble, y distinguirlo es lo que evita corromper el dibujo de todas
 * las cadenas que ya funcionaban.
 */
function estanEnLinea(a, b) {
  if (a.orientation !== b.orientation) return false;
  return a.orientation === 'vertical'
    ? minX(a) === minX(b)
    : minY(a) === minY(b);
}

function joinOffset(prev, curr, prevOffset, cell) {
  const prevDouble = prev.tile[0] === prev.tile[1];
  const currDouble = curr.tile[0] === curr.tile[1];

  // Sin doble de por medio no hay nada que centrar.
  if (!prevDouble && !currDouble) return { x: prevOffset.x, y: prevOffset.y };

  // Una detras de la otra: la cadena sigue derecho y tampoco hay que centrar.
  if (estanEnLinea(prev, curr)) return { x: prevOffset.x, y: prevOffset.y };

  const union = celdaDeUnion(prev, curr);
  if (!union) return { x: prevOffset.x, y: prevOffset.y };

  // El doble se centra sobre la union, en el eje de su lado largo.
  if (currDouble) {
    const objetivo = centroDeCelda(union.enA, cell);
    const actual = center(curr, cell);
    return curr.orientation === 'vertical'
      ? { x: prevOffset.x, y: prevOffset.y + objetivo.y - actual.y }
      : { x: prevOffset.x + objetivo.x - actual.x, y: prevOffset.y };
  }

  // El doble es el anterior: se corre la ficha nueva para que su union quede
  // sobre el centro del doble.
  const objetivo = center(prev, cell);
  const actual = centroDeCelda(union.enB, cell);
  return prev.orientation === 'vertical'
    ? { x: prevOffset.x, y: prevOffset.y + objetivo.y - actual.y }
    : { x: prevOffset.x + objetivo.x - actual.x, y: prevOffset.y };
}

export function computeBoardOffsets(board, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0) return [];
  const cell = layout.cell;
  const offsets = new Array(board.length);
  const firstIdx = board.findIndex((t) => t.side === 'first');
  const start = firstIdx !== -1 ? firstIdx : 0;
  offsets[start] = { x: 0, y: 0 };
  for (let i = start + 1; i < board.length; i++) {
    offsets[i] = joinOffset(board[i - 1], board[i], offsets[i - 1], cell);
  }
  for (let i = start - 1; i >= 0; i--) {
    offsets[i] = joinOffset(board[i + 1], board[i], offsets[i + 1], cell);
  }
  return offsets;
}

export function anchorOffsetFor(board, placement, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0) return { x: 0, y: 0 };
  const offsets = computeBoardOffsets(board, layout);
  const idx = placement.side === 'left' ? 0 : board.length - 1;
  return joinOffset(board[idx], placement, offsets[idx] || { x: 0, y: 0 }, layout.cell);
}

export function rectOf(placed, offset, cell) {
  const w = placed.orientation === 'horizontal' ? cell * 2 : cell;
  const h = placed.orientation === 'horizontal' ? cell : cell * 2;
  return {
    left: minX(placed) * cell + offset.x,
    top: minY(placed) * cell + offset.y,
    width: w,
    height: h
  };
}

function overlaps(a, b) {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

export function boardEnds(board) {
  if (!board || board.length === 0) return null;
  return { left: board[0].tile[0], right: board[board.length - 1].tile[1] };
}

export function placementsFor(board, tile, side, layout = DEFAULT_LAYOUT, diagnostico = null) {
  const GRID = layout.grid;
  const cell = layout.cell;
  const out = [];

  if (!board || board.length === 0) {
    if (side !== 'first') return [];
    const cx = Math.floor(GRID / 2);
    const cy = Math.floor(GRID / 2);
    return [
      { tile: [tile[0], tile[1]], x: cx, y: cy, x2: cx + 1, y2: cy, orientation: 'horizontal', side: 'first' },
      { tile: [tile[0], tile[1]], x: cx, y: cy, x2: cx, y2: cy + 1, orientation: 'vertical', side: 'first' }
    ];
  }

  let endTile;
  let ex;
  let ey;
  let ev;
  if (side === 'left') {
    endTile = board[0];
    ex = endTile.x;
    ey = endTile.y;
    ev = endTile.tile[0];
  } else if (side === 'right') {
    endTile = board[board.length - 1];
    ex = endTile.x2;
    ey = endTile.y2;
    ev = endTile.tile[1];
  } else {
    return [];
  }

  if (tile[0] !== ev && tile[1] !== ev) {
    if (diagnostico) diagnostico.push({ motivo: 'no-coincide-con-el-extremo' });
    return [];
  }

  const connVal = ev;
  const outerVal = tile[0] === ev ? tile[1] : tile[0];

  const occupied = new Set();
  const ownerOf = new Map();
  board.forEach((t, i) => {
    for (const k of [t.x + ',' + t.y, t.x2 + ',' + t.y2]) {
      occupied.add(k);
      ownerOf.set(k, i);
    }
  });

  const offsets = computeBoardOffsets(board, layout);
  const anchorIdx = side === 'left' ? 0 : board.length - 1;
  const anchor = board[anchorIdx];
  const anchorOffset = offsets[anchorIdx] || { x: 0, y: 0 };

  // Devuelve null si la colocacion es valida, o el motivo del rechazo.
  // Tenerlo separado permite auditar por que se descarta cada opcion
  // (ver `explainPlacements`) en vez de adivinar.
  const evaluar = (p, permitirRozar = false) => {
    const pMinX = minX(p);
    const pMinY = minY(p);
    const pMaxX = maxX(p);
    const pMaxY = maxY(p);

    // Solo hace falta que la ficha entre en el tablero. Antes habia ademas una
    // "banda de borde" que prohibia fichas horizontales en las columnas 0/19 y
    // verticales en las filas 0/19. Existia para que no quedaran cortadas contra
    // el margen, pero desde que el tablero se escala y se ve entero (§29) ya no
    // protege de nada: medido, causaba el 37% de los bloqueos y sacarla bajo las
    // trancas de 49.2% a 37.8% sin que se saliera una sola ficha del grid.
    if (pMinX < 0 || pMaxX >= GRID || pMinY < 0 || pMaxY >= GRID) return 'fuera-del-tablero';

    if (occupied.has(p.x + ',' + p.y) || occupied.has(p.x2 + ',' + p.y2)) return 'celda-ocupada';

    // La ficha nueva solo puede tocar a la ficha con la que engancha.
    //
    // Medido: relajar esta regla NO destraba ni una jugada (12.7% de bloqueo con
    // y sin ella). Lo que hace es adelantar un rechazo que igual iba a ocurrir en
    // el chequeo de solape visual. A cambio deja el tablero limpio: sin la regla
    // quedan 154 fichas apretadas contra vecinas que no son de la cadena, con
    // ella quedan 0. Es gratis, se queda.
    if (!permitirRozar) {
      for (const [cx, cy] of [[p.x, p.y], [p.x2, p.y2]]) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const owner = ownerOf.get(cx + dx + ',' + (cy + dy));
          if (owner !== undefined && owner !== anchorIdx) return 'roza-otra-ficha';
        }
      }
    }

    const offset = joinOffset(anchor, p, anchorOffset, cell);
    const pRect = rectOf(p, offset, cell);
    for (let i = 0; i < board.length; i++) {
      if (overlaps(pRect, rectOf(board[i], offsets[i] || { x: 0, y: 0 }, cell))) return 'solapa-visualmente';
    }

    return null;
  };

  // `permitirRozar` solo lo usa la pasada de rescate de los dobles (abajo).
  let permitirRozar = false;

  // Solo se enciende en el rescate. Ver mas abajo: ofrecer el giro del doble
  // siempre hace que se elija en juego normal y deja el tablero mas apretado.
  let dobleDobla = false;
  const add = (p) => {
    const motivo = evaluar(p, permitirRozar);
    if (diagnostico) diagnostico.push({ ...p, motivo });
    if (motivo === null) out.push(p);
  };

  const endIsDouble = endTile.tile[0] === endTile.tile[1];
  const esDoble = tile[0] === tile[1];

  const sideTile = side === 'left' ? [outerVal, connVal] : [connVal, outerVal];

  const addAlong = (orientation, nearCell, farCell) => {
    const near = side === 'left' ? farCell : nearCell;
    const far = side === 'left' ? nearCell : farCell;
    add({
      tile: [sideTile[0], sideTile[1]],
      x: near.x,
      y: near.y,
      x2: far.x,
      y2: far.y,
      orientation,
      side
    });
  };

  const generarCandidatos = () => {
    if (endIsDouble) {
      // Un doble esta cruzado sobre la cadena, asi que la cadena puede salir por
      // sus cuatro costados. Antes la direccion se tomaba de si era el extremo
      // izquierdo o el derecho, y solo se miraban los otros lados cuando el doble
      // estaba pegado al borde del tablero. Resultado: si esa unica salida estaba
      // ocupada, la ficha quedaba injugable aunque hubiera sitio de sobra al lado.
      // Es el mismo error corregido en la seccion 24 para las fichas normales,
      // que nunca se habia corregido para los dobles.
      if (endTile.orientation === 'horizontal') {
        const bx = minX(endTile);
        const rx = maxX(endTile);
        for (const col of [bx, rx]) {
          addAlong('vertical', { x: col, y: ey - 1 }, { x: col, y: ey - 2 });
          addAlong('vertical', { x: col, y: ey + 1 }, { x: col, y: ey + 2 });
        }
        addAlong('horizontal', { x: bx - 1, y: ey }, { x: bx - 2, y: ey });
        addAlong('horizontal', { x: rx + 1, y: ey }, { x: rx + 2, y: ey });
      } else {
        const by = minY(endTile);
        const ry = maxY(endTile);
        for (const fila of [by, ry]) {
          addAlong('horizontal', { x: ex - 1, y: fila }, { x: ex - 2, y: fila });
          addAlong('horizontal', { x: ex + 1, y: fila }, { x: ex + 2, y: fila });
        }
        addAlong('vertical', { x: ex, y: by - 1 }, { x: ex, y: by - 2 });
        addAlong('vertical', { x: ex, y: ry + 1 }, { x: ex, y: ry + 2 });
      }
    } else {
      // La punta libre del extremo puede apuntar en cualquiera de las 4 direcciones:
      // la direccion "recta" sale de la geometria de la propia ficha, no del lado de la cadena.
      const body = side === 'left'
        ? { x: endTile.x2, y: endTile.y2 }
        : { x: endTile.x, y: endTile.y };
      const free = { x: ex, y: ey };
      const dx = free.x - body.x;
      const dy = free.y - body.y;

      if (tile[0] === tile[1]) {
        // Doble: se cruza perpendicular a la cadena. Puede sobresalir hacia un
        // lado o hacia el otro de la linea, igual que en una mesa de verdad.
        // Ofrecer una sola de las dos dejaba dobles injugables sin motivo.
        if (endTile.orientation === 'horizontal') {
          const col = free.x + dx;
          addAlong('vertical', { x: col, y: ey }, { x: col, y: ey - 1 });
          addAlong('vertical', { x: col, y: ey }, { x: col, y: ey + 1 });

          // El doble tambien puede DOBLAR en la punta, igual que una ficha
          // normal. La cadena gira y el doble se cruza sobre la direccion
          // nueva, asi que va en la fila de arriba o la de abajo, centrado
          // sobre la columna de la punta. Solo en el rescate.
          if (dobleDobla) {
            for (const row of [ey - 1, ey + 1]) {
              addAlong('horizontal', { x: ex, y: row }, { x: ex - 1, y: row });
              addAlong('horizontal', { x: ex, y: row }, { x: ex + 1, y: row });
            }
          }
        } else {
          const row = free.y + dy;
          addAlong('horizontal', { x: ex, y: row }, { x: ex - 1, y: row });
          addAlong('horizontal', { x: ex, y: row }, { x: ex + 1, y: row });

          if (dobleDobla) {
            for (const col of [ex - 1, ex + 1]) {
              addAlong('vertical', { x: col, y: ey }, { x: col, y: ey - 1 });
              addAlong('vertical', { x: col, y: ey }, { x: col, y: ey + 1 });
            }
          }
        }

        // ## Por que el doble tambien dobla
        //
        // Antes solo se ofrecia pasando la punta. Si la punta quedaba contra la
        // pared, esa unica salida caia fuera del tablero y el doble era
        // injugable teniendo sitio de sobra al lado. Lo reporto Jonathan con una
        // captura: "no me deja poner el doble cero, solo me deja poner el cero
        // tres". Medido: pasaba en el 1% de las posiciones.
        //
        // Una ficha normal ya podia doblar en la punta desde la seccion 24; el
        // doble no. Ahora si, y sigue cruzado: si la cadena dobla y se va
        // horizontal, el doble va vertical. Nunca en paralelo, que es lo que el
        // mismo rechazo en la seccion 90.
        //
        // Esto obligo a cambiar el dibujo: `joinOffset` centraba el doble sobre
        // el CENTRO de la ficha vecina, y al costado esa vecina ocupa dos
        // casillas en el eje que importa, con lo que el doble quedaba corrido
        // media ficha. Ahora se centra sobre la UNION.
        //
        // Antes esta salida de emergencia ofrecia el doble en la MISMA
        // direccion que la cadena: con la cadena horizontal, un doble
        // horizontal. Eso es un doble acostado en linea, que en una mesa de
        // verdad no existe y se ve mal de inmediato. Lo reporto Jonathan con
        // una captura: el doble contra la pared quedaba en paralelo.
        //
      } else {
        // 1. Recta: sigue hacia donde apunta la punta libre
        addAlong(
          endTile.orientation,
          { x: free.x + dx, y: free.y + dy },
          { x: free.x + 2 * dx, y: free.y + 2 * dy }
        );

        // 2 y 3. Giros: perpendicular, pivotando sobre la punta libre
        if (endTile.orientation === 'horizontal') {
          addAlong('vertical', { x: free.x, y: free.y - 1 }, { x: free.x, y: free.y - 2 });
          addAlong('vertical', { x: free.x, y: free.y + 1 }, { x: free.x, y: free.y + 2 });
        } else {
          addAlong('horizontal', { x: free.x - 1, y: free.y }, { x: free.x - 2, y: free.y });
          addAlong('horizontal', { x: free.x + 1, y: free.y }, { x: free.x + 2, y: free.y });
        }
      }
    }
  };

  generarCandidatos();

  // Primer rescate: el doble dobla en la punta.
  //
  // Va como rescate y no como opcion normal por una razon medida. Ofrecerlo
  // siempre baja los dobles trabados del 4,87% al 2,10%, pero las fichas
  // NORMALES trabadas suben del 0,348% al 1,204%: el doble atravesado en un
  // giro deja el tablero mas apretado y estorba a todo lo demas. En total,
  // peor. Como rescate arregla el caso que reporto Jonathan sin cambiar en
  // nada las partidas donde el doble ya entraba.
  if (out.length === 0 && esDoble) {
    dobleDobla = true;
    if (diagnostico) diagnostico.push({ motivo: 'rescate-el-doble-dobla' });
    generarCandidatos();
  }

  // Pasada de rescate. La regla de "no rozar otra ficha" deja el tablero
  // prolijo, pero cuando aprieta rechaza colocaciones que el jugador ve
  // perfectamente posibles: es lo que llama "estar trancado teniendo la ficha".
  //
  // Si a la ficha no le queda NI UNA casilla, se repasan las mismas posiciones
  // permitiendo que roce. Solo se relaja rozar: solaparse y salirse del tablero
  // se siguen rechazando, asi que entra pegada a la vecina pero nunca encima.
  //
  // Empezo siendo solo para dobles (§71). Medido despues sobre 200 partidas por
  // formato, extenderla a todas las fichas baja las trabadas de 0,231% a
  // 0,071% y las trancas de 19,4% a 19,0%, con cero fichas montadas y cero
  // fuera del tablero. El precio es cosmetico: pasan de 259 a 1.955 fichas
  // pegadas a una vecina que no es su enlace, o sea 2 de cada 100 posiciones.
  if (out.length === 0) {
    permitirRozar = true;
    if (diagnostico) diagnostico.push({ motivo: 'pasada-de-rescate' });
    generarCandidatos();
    permitirRozar = false;
  }

  const seen = new Set();
  const unique = [];
  for (const p of out) {
    const k = minX(p) + ',' + minY(p) + ',' + p.orientation;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(p);
  }
  return unique;
}

export function placementKey(p) {
  return [p.x, p.y, p.x2, p.y2, p.orientation].join(',');
}


/**
 * Que tan lejos del borde queda la punta libre. Se corta en 2 porque mas lejos
 * ya da lo mismo: lo unico que importa es no dejarla contra la pared.
 */
function aireEnLaPunta(p, side, grid) {
  const punta = side === 'left' ? { x: p.x, y: p.y } : { x: p.x2, y: p.y2 };
  return Math.min(2, punta.x, punta.y, grid - 1 - punta.x, grid - 1 - punta.y);
}

/**
 * Cuanto sitio libre le queda a la punta nueva: casillas seguidas libres en las
 * cuatro direcciones, hasta tres por direccion.
 *
 * `aireEnLaPunta` solo mira la distancia al borde de la mesa; esta mira ademas
 * las otras fichas. Sin ella la cadena se enrosca sobre si misma y se deja sin
 * salida, que es lo que reporto el usuario: veia sitio de sobra en la mesa y la
 * ficha no entraba porque la punta habia quedado metida en un rincon.
 */
export function espacioEnLaPunta(board, p, side, layout = DEFAULT_LAYOUT) {
  const grid = layout.grid;
  const ocupado = new Set();
  board.forEach((t) => {
    ocupado.add(t.x + ',' + t.y);
    ocupado.add(t.x2 + ',' + t.y2);
  });
  ocupado.add(p.x + ',' + p.y);
  ocupado.add(p.x2 + ',' + p.y2);

  const punta = side === 'left' ? { x: p.x, y: p.y } : { x: p.x2, y: p.y2 };
  let libres = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let k = 1; k <= 3; k++) {
      const x = punta.x + dx * k;
      const y = punta.y + dy * k;
      if (x < 0 || y < 0 || x >= grid || y >= grid || ocupado.has(x + ',' + y)) break;
      libres++;
    }
  }
  return libres;
}

/**
 * Elige donde cae la ficha cuando el jugador no lo dice (el bot, o el servidor
 * si el cliente no manda posicion).
 *
 * Primero se evita dejar la punta contra el borde, y recien despues se prefiere
 * seguir derecho. Antes solo miraba la recta, y la cadena avanzaba en linea
 * hasta chocar con la pared: medido, el extremo quedaba pegado al borde el
 * 19.2% del tiempo, y el 66% de las fichas trancadas eran un doble que ya no
 * tenia hacia donde cruzarse.
 */
/**
 * Cuanto deja abierto el tablero esta colocacion, mirando una jugada adelante.
 *
 * Se pone la ficha y se pregunta, por cada punta, si todavia entra algo: una
 * ficha normal (vale 2) y un doble (vale 1). Cuatro sondas alcanzan, porque lo
 * que decide si una ficha entra es la geometria y si es doble o no, no su
 * numero concreto.
 *
 * Es el "cerebro" que pidio el usuario el 2026-09-02: que la cadena no se meta
 * sola en un rincon y deje a alguien con una ficha buena que no puede poner.
 * Medido: baja las fichas trabadas de 0,338% a 0,034%, un factor 10, sin mover
 * las trancas (19,3% -> 19,6%). Ver contexto/README.md seccion 81.
 */
export function aperturaFutura(board, placement, side, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0 || !placement) return 0;
  const nuevo = side === 'left' ? [placement, ...board] : [...board, placement];
  const ends = boardEnds(nuevo);
  if (!ends) return 0;

  let abierto = 0;
  for (const lado of ['left', 'right']) {
    const v = ends[lado];
    if (v == null) continue;
    const otro = v === 0 ? 1 : 0;
    if (placementsFor(nuevo, [v, otro], lado, layout).length > 0) abierto += 2;
    if (placementsFor(nuevo, [v, v], lado, layout).length > 0) abierto += 1;
  }
  return abierto;
}

/**
 * Que tan lejos del centro del tablero queda la cadena si la ficha se pone aca.
 *
 * Menor es mejor. Sirve para desempatar: entre dos colocaciones igual de buenas,
 * conviene la que devuelve la cadena hacia el medio en vez de la que la empuja
 * hacia una pared.
 *
 * Medido: la cadena se corre 2,4 casillas del centro de media, y termina pegada
 * a una pared en el 28% de las jugadas con la rejilla de 16. Contra la pared es
 * donde se traban las fichas.
 */
export function distanciaAlCentro(board, placement, layout = DEFAULT_LAYOUT) {
  const centro = layout.grid / 2;
  let x1 = Math.min(placement.x, placement.x2);
  let x2 = Math.max(placement.x, placement.x2);
  let y1 = Math.min(placement.y, placement.y2);
  let y2 = Math.max(placement.y, placement.y2);

  for (const t of board) {
    x1 = Math.min(x1, minX(t)); x2 = Math.max(x2, maxX(t));
    y1 = Math.min(y1, minY(t)); y2 = Math.max(y2, maxY(t));
  }

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  return Math.hypot(cx - centro, cy - centro);
}

export function straightestPlacement(board, placements, side, layout = DEFAULT_LAYOUT) {
  if (!placements || placements.length === 0) return null;
  if (!board || board.length === 0) return placements[0];

  const grid = layout.grid;
  const endTile = side === 'left' ? board[0] : board[board.length - 1];

  // Si el extremo es un doble, salir CRUZADO va primero, antes que el filtro de
  // no pegarse al borde. Al reves, las cruzadas se descartaban por estar mas
  // cerca del borde y el doble terminaba en linea igual.
  if (endTile.tile[0] === endTile.tile[1]) {
    const cruzadas = placements.filter((p) => p.orientation !== endTile.orientation);
    if (cruzadas.length > 0) placements = cruzadas;
  }

  // Primero el cerebro: entre las colocaciones posibles gana la que deja mas
  // abierto el tablero para la jugada siguiente. Va ANTES que no pegarse al
  // borde y que seguir derecho, que son atajos; esto mira de verdad.
  if (placements.length > 1) {
    const aperturas = placements.map((p) => aperturaFutura(board, p, side, layout));
    const mejorApertura = Math.max(...aperturas);
    placements = placements.filter((p, i) => aperturas[i] === mejorApertura);
  }

  const mejorAire = Math.max(...placements.map((p) => aireEnLaPunta(p, side, grid)));
  placements = placements.filter((p) => aireEnLaPunta(p, side, grid) === mejorAire);
  const dx = side === 'left' ? endTile.x - endTile.x2 : endTile.x2 - endTile.x;
  const dy = side === 'left' ? endTile.y - endTile.y2 : endTile.y2 - endTile.y;
  const ex = side === 'left' ? endTile.x : endTile.x2;
  const ey = side === 'left' ? endTile.y : endTile.y2;
  const cx = ex + dx;
  const cy = ey + dy;
  const cx2 = cx + dx;
  const cy2 = cy + dy;
  // Seguir derecho manda: una cadena recta se traba menos que una que
  // serpentea. Entre las que van derecho (o entre todas si ninguna va derecho)
  // gana la que deja mas sitio libre alrededor, para no enroscarse.
  //
  // Medido en tres tandas de ~120.000 turnos cada una, contra elegir solo la
  // recta: la ficha trabada baja de 0,61% a 0,45%, de 0,75% a 0,49% y de 0,66%
  // a 0,53%. Ojo, el orden importa: aplicar el sitio libre ANTES que la recta
  // la EMPEORA (0,61% -> 0,90%). Ver contexto/README.md seccion 73.
  //
  // Pero si el extremo es un DOBLE, "derecho" es al reves. Un doble esta
  // cruzado sobre la cadena, asi que la cadena sale por sus costados, no por su
  // mismo eje. Tomando la direccion del propio doble, la cadena le seguia de
  // largo y el doble quedaba de pie, en linea, en vez de acostado: eso es lo
  // que reporto el usuario. Ver contexto/README.md seccion 76.
  const extremoEsDoble = endTile.tile[0] === endTile.tile[1];
  const rectas = extremoEsDoble
    ? placements.filter((p) => p.orientation !== endTile.orientation)
    : placements.filter((p) =>
        side === 'left'
          ? p.x === cx2 && p.y === cy2 && p.x2 === cx && p.y2 === cy
          : p.x === cx && p.y === cy && p.x2 === cx2 && p.y2 === cy2
      );
  const pool = rectas.length > 0 ? rectas : placements;
  if (pool.length === 1) return pool[0];
  const espacios = pool.map((p) => espacioEnLaPunta(board, p, side, layout));
  const mejorEspacio = Math.max(...espacios);
  const finalistas = pool.filter((p, i) => espacios[i] === mejorEspacio);

  // Ultimo desempate: la que deja la cadena mas cerca del centro. Se toca solo
  // aca, que es donde el orden ya no cambia nada mas: adelantarlo empeora, como
  // se midio con el criterio de compacidad (ver contexto seccion 88).
  if (finalistas.length === 1) return finalistas[0];
  const distancias = finalistas.map((p) => distanciaAlCentro(board, p, layout));

  return finalistas[distancias.indexOf(Math.min(...distancias))];
}

/**
 * Igual que `placementsFor` pero devuelve TODAS las opciones que el motor
 * considero, con el motivo por el que descarto cada una. Sirve para auditar
 * las reglas de colocacion en vez de adivinar por que una ficha no entra.
 */
export function explainPlacements(board, tile, side, layout = DEFAULT_LAYOUT) {
  const diagnostico = [];
  const validas = placementsFor(board, tile, side, layout, diagnostico);
  return { validas, candidatas: diagnostico };
}
