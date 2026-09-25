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
  const pares = [];
  for (const p of celdasDe(a)) {
    for (const q of celdasDe(b)) {
      if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1) pares.push({ enA: p, enB: q });
    }
  }
  if (pares.length === 0) return null;
  if (pares.length === 1) return pares[0];

  // Hay mas de un par pegado: pasa cuando la cadena DOBLA y las dos fichas
  // quedan lado a lado. Ahi elegir el primero que aparezca es elegir al azar, y
  // la mitad de las veces sale el de atras: el doble se centra sobre el cuerpo
  // de su vecina y queda apilado al lado, en vez de cruzar la punta. Es lo que
  // Jonathan reporto con capturas (§127).
  //
  // El par bueno se sabe por los NUMEROS: las dos fichas se tocan por la cara
  // que comparte valor. Se busca ese, y si no se distingue se deja el primero.
  const valorEn = (t, c) => (c.x === t.x && c.y === t.y ? t.tile[0] : t.tile[1]);
  const porValor = pares.find((par) => valorEn(a, par.enA) === valorEn(b, par.enB));
  return porValor || pares[0];
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
    // ...salvo si se tocan POR EL CANTO, o sea si la vecina esta en la
    // prolongacion del lado largo del doble. Eso pasa en el rescate contra la
    // pared: el doble se planta de costado en la punta en vez de cruzarla.
    // Centrarlo ahi lo corre una ficha y media y lo monta encima de la cadena.
    const haciaLaVecina = { x: union.enA.x - union.enB.x, y: union.enA.y - union.enB.y };
    const porElCanto = curr.orientation === 'horizontal'
      ? haciaLaVecina.x !== 0
      : haciaLaVecina.y !== 0;
    if (porElCanto) return { x: prevOffset.x, y: prevOffset.y };

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

export function placementsFor(board, tile, side, layout = DEFAULT_LAYOUT, diagnostico = null, { sinParedes = false } = {}) {
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
    if (!paredesAbiertas && (pMinX < 0 || pMaxX >= GRID || pMinY < 0 || pMaxY >= GRID)) return 'fuera-del-tablero';

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

  // La ultima salida (seccion 206): la pared de la mesa se abre. Ver abajo.
  let paredesAbiertas = false;

  // Solo se enciende en el rescate. Ver mas abajo: ofrecer el giro del doble
  // siempre hace que se elija en juego normal y deja el tablero mas apretado.
  let dobleDobla = false;

  // Idem: la cadena saliendo por el LADO LARGO de un doble. Ver el rescate.
  let salirPorElLargo = false;

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
        // Por los lados CORTOS: la cadena atraviesa el doble y sigue derecho.
        for (const col of [bx, rx]) {
          addAlong('vertical', { x: col, y: ey - 1 }, { x: col, y: ey - 2 });
          addAlong('vertical', { x: col, y: ey + 1 }, { x: col, y: ey + 2 });
        }
        // Por los lados LARGOS: solo si no hay mas remedio (§127).
        if (salirPorElLargo) {
          addAlong('horizontal', { x: bx - 1, y: ey }, { x: bx - 2, y: ey });
          addAlong('horizontal', { x: rx + 1, y: ey }, { x: rx + 2, y: ey });
        }
      } else {
        const by = minY(endTile);
        const ry = maxY(endTile);
        for (const fila of [by, ry]) {
          addAlong('horizontal', { x: ex - 1, y: fila }, { x: ex - 2, y: fila });
          addAlong('horizontal', { x: ex + 1, y: fila }, { x: ex + 2, y: fila });
        }
        if (salirPorElLargo) {
          addAlong('vertical', { x: ex, y: by - 1 }, { x: ex, y: by - 2 });
          addAlong('vertical', { x: ex, y: ry + 1 }, { x: ex, y: ry + 2 });
        }
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
          // normal, cuando pasando la punta no cabe. Solo en el rescate.
          //
          // Se queda CRUZADO sobre la ficha anterior, nunca acostado a su lado:
          // el doble sigue vertical, pero en vez de ir una columna mas alla de
          // la punta se planta en la columna DE la punta, saliendo hacia arriba
          // o hacia abajo. Ver el comentario de abajo.
          if (dobleDobla) {
            addAlong('vertical', { x: ex, y: ey - 1 }, { x: ex, y: ey - 2 });
            addAlong('vertical', { x: ex, y: ey + 1 }, { x: ex, y: ey + 2 });
          }
        } else {
          const row = free.y + dy;
          addAlong('horizontal', { x: ex, y: row }, { x: ex - 1, y: row });
          addAlong('horizontal', { x: ex, y: row }, { x: ex + 1, y: row });

          if (dobleDobla) {
            addAlong('horizontal', { x: ex - 1, y: ey }, { x: ex - 2, y: ey });
            addAlong('horizontal', { x: ex + 1, y: ey }, { x: ex + 2, y: ey });
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

  // Primer rescate: la cadena sale por el lado LARGO del doble (§127).
  //
  // Un doble va cruzado sobre la cadena, asi que la cadena lo atraviesa y sale
  // por el lado de enfrente. Salir por su lado largo deja al doble ACOSTADO EN
  // LINEA con la cadena, que en una mesa de verdad no pasa y se ve mal al
  // instante. Lo reporto Jonathan con capturas: *"ve que los dobles a veces se
  // ponen mal"*.
  //
  // Medido sobre 300 partidas y 70.516 turnos, ofrecerlo siempre dejaba el
  // 13,12% de los dobles en paralelo. Como rescate, solo entra cuando el doble
  // no tiene ninguna otra salida, que es justo el caso en que la alternativa
  // seria dejar la ficha injugable.
  if (out.length === 0 && endIsDouble) {
    salirPorElLargo = true;
    if (diagnostico) diagnostico.push({ motivo: 'rescate-salir-por-el-largo' });
    generarCandidatos();
  }

  // Segundo rescate: el doble dobla en la punta.
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

  // LA ULTIMA SALIDA (seccion 206). Raul, 23-sep: «no puede pasar que no te
  // deje jugar lo que quieras jugar». La rejilla de 16x16 es una pared de
  // mentira: el paño es la pantalla entera y la camara sigue a la cadena a
  // donde vaya. Si despues de todos los rescates la ficha no tiene casilla,
  // se abre la pared y se busca por fuera (solaparse y caer en casilla ocupada
  // siguen prohibidos: nunca queda una ficha encima de otra).
  //
  // Solo la piden los que deciden QUE SE PUEDE JUGAR (`sinParedes`: la lista de
  // jugadas del motor, el servidor y el iman del telefono). El trazado y el
  // destranque siguen con la pared puesta, asi que primero se intenta lo
  // bonito —reacomodar dentro de la mesa— y esto solo entra cuando nada cabe.
  if (out.length === 0 && sinParedes) {
    paredesAbiertas = true;
    permitirRozar = true;
    if (diagnostico) diagnostico.push({ motivo: 'la-ultima-salida' });
    generarCandidatos();
    if (out.length === 0 && endIsDouble) { salirPorElLargo = true; generarCandidatos(); }
    if (out.length === 0 && esDoble) { dobleDobla = true; generarCandidatos(); }
    permitirRozar = false;
    paredesAbiertas = false;
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

/**
 * La ventana del telefono, en celdas, a la escala mas cercana que permite la
 * mesa (§170): unas 9 de ancho por 14 de alto. Es la vara para saber si una
 * colocacion obliga a la camara a alejarse.
 */
export const VENTANA_TELEFONO = { ancho: 9, alto: 14 };

/**
 * La ventana de ESTA mesa (seccion 207). La pone quien arma la partida en
 * `layout.ventana`, segun donde queda la cadena en la pantalla; sin ella se
 * usa la del telefono de siempre.
 */
export const ventanaDe = (layout) => {
  const v = layout && layout.ventana;
  return v && v.ancho > 0 && v.alto > 0 ? v : VENTANA_TELEFONO;
};

/** La caja que ocupa la cadena (en celdas), sumandole `p` si se pasa. */
export function cajaDeLaCadena(board, p = null) {
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  const mirar = (t) => {
    x1 = Math.min(x1, t.x, t.x2); x2 = Math.max(x2, t.x, t.x2);
    y1 = Math.min(y1, t.y, t.y2); y2 = Math.max(y2, t.y, t.y2);
  };
  for (const t of board) mirar(t);
  if (p) mirar(p);
  return { ancho: x2 - x1 + 1, alto: y2 - y1 + 1 };
}

/**
 * Cuanto se tiene que alejar la camara del telefono para que la cadena quepa
 * si se agrega `p`: 1 = cabe justo, mas de 1 = hay que alejarse.
 */
export function alejamiento(board, p, ventana = VENTANA_TELEFONO) {
  const c = cajaDeLaCadena(board, p);
  return Math.max(c.ancho / ventana.ancho, c.alto / ventana.alto);
}

/**
 * Se queda con las colocaciones que MENOS obligan a alejar la camara (§170).
 *
 * Raul: "que la culebra vaya por el camino que haga menos zoom-out, para que
 * las fichas no se vean minusculas". La pantalla del telefono es alta y
 * angosta, asi que la cadena tiene que crecer a lo largo y doblar antes de
 * ensancharse. Mientras seguir derecho no aleje la camara mas que doblar, se
 * sigue derecho (el desempate de abajo); cuando una punta ya obliga a alejar,
 * gana la que menos aleja.
 */
export function preferirCompactas(board, placements, ventana = VENTANA_TELEFONO) {
  if (!placements || placements.length < 2) return placements;
  const puntajes = placements.map((p) => alejamiento(board, p, ventana));
  // Solo se interviene cuando hay opciones que CABEN y otras que no: se
  // descartan las que alejan la camara. Si todas caben, o ninguna, se dejan
  // todas y decide la recta. Elegir siempre la mas compacta enroscaba la
  // cadena sobre si misma y multiplicaba por veinte las fichas trabadas
  // (medido: veto total 0,07 % -> 1,66 %).
  const caben = placements.filter((p, i) => puntajes[i] <= 1 + 1e-9);
  return caben.length > 0 && caben.length < placements.length ? caben : placements;
}

/**
 * Se queda con las colocaciones que no dejan la cadena PEGADA a si misma (§174).
 *
 * Raul, con la culebra bajando en columna al lado de la otra columna: "mira
 * como se pego eso". El motor no deja rozar en celdas, pero el dibujo lleva el
 * corrimiento de los dobles (media celda por cada uno) y dos fichas a una celda
 * de distancia pueden quedar dibujadas a media. Aqui se mira el dibujo: si hay
 * casillas que quedan a una celda entera de toda ficha que no sea la punta, se
 * descartan las que quedan mas cerca. Si ninguna se salva, se dejan todas.
 */
export function preferirDespegadas(board, placements, side, layout = DEFAULT_LAYOUT) {
  if (!board || board.length < 2 || !placements || placements.length < 2) return placements;
  if (side !== 'left' && side !== 'right') return placements;
  const cell = layout.cell;
  const offsets = computeBoardOffsets(board, layout);
  const rects = board.map((t, i) => rectOf(t, offsets[i], cell));
  const anchorIdx = side === 'left' ? 0 : board.length - 1;
  const despegadas = placements.filter((p) => {
    const off = p.tile ? joinOffset(board[anchorIdx], p, offsets[anchorIdx], cell) : offsets[anchorIdx];
    const r = rectOf(p, off, cell);
    for (let i = 0; i < board.length; i += 1) {
      if (i === anchorIdx) continue;
      const a = rects[i];
      const dx = Math.max(a.left - (r.left + r.width), r.left - (a.left + a.width), 0);
      const dy = Math.max(a.top - (r.top + r.height), r.top - (a.top + a.height), 0);
      if (dx < cell - 1 && dy < cell - 1) return false;
    }
    return true;
  });
  return despegadas.length > 0 && despegadas.length < placements.length ? despegadas : placements;
}

/**
 * EL CAMINO FIJO DEL TELEFONO (§175, mockup C): la culebra sigue un recorrido
 * predeterminado, alto y angosto. Cada punta baja (o sube) en columna; al
 * tocar la pared pone un puente acostado de una ficha hacia afuera (la punta
 * derecha hacia la derecha, la izquierda hacia la izquierda) y vuelve en la
 * columna siguiente, en sentido contrario. Las columnas quedan a tres celdas,
 * asi que nunca se pegan. Los dobles van cruzados como siempre; el puente en
 * la pared es la unica curva.
 *
 * Con que sentido fluye la punta: el de la ultima ficha parada de ese lado,
 * volteado por cada puente (acostada suelta) que haya despues de ella.
 */
function sentidoDeLaPunta(board, side, grid) {
  const n = board.length;
  for (let k = 0; k < n; k += 1) {
    const t = side === 'left' ? board[k] : board[n - 1 - k];
    // Un puente (acostada suelta) marca la curva: si esta abajo, la columna
    // nueva sube; si esta arriba, baja.
    if (t.orientation === 'horizontal' && t.tile[0] !== t.tile[1] && t.side !== 'first') {
      return t.y >= grid / 2 ? -1 : 1;
    }
    if (t.orientation === 'vertical' && t.tile[0] !== t.tile[1]) {
      return side === 'left' ? Math.sign(t.y - t.y2) : Math.sign(t.y2 - t.y);
    }
  }
  return side === 'left' ? -1 : 1;
}

function columnaDeLaPunta(board, side) {
  const n = board.length;
  for (let k = 0; k < n; k += 1) {
    const t = side === 'left' ? board[k] : board[n - 1 - k];
    if (t.orientation === 'vertical') return t.x;
  }
  return null;
}

export function preferirCamino(board, placements, side, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0 || !placements || placements.length < 2) return placements;
  if (side !== 'left' && side !== 'right') return placements;
  const grid = layout.grid;
  const dy = sentidoDeLaPunta(board, side, grid);
  // Las columnas viven entre la fila 1 y la penultima: la ventana del telefono
  // mide 14 celdas de alto, y asi la culebra dobla antes de la pared.
  const paradas = placements.filter((p) =>
    p.orientation === 'vertical'
    && (side === 'left' ? Math.sign(p.y - p.y2) : Math.sign(p.y2 - p.y)) === dy
    && Math.min(p.y, p.y2) >= 1 && Math.max(p.y, p.y2) <= grid - 2
  );
  if (paradas.length > 0) {
    const col = columnaDeLaPunta(board, side);
    const enColumna = paradas.filter((p) => p.x === col);
    return enColumna.length > 0 ? enColumna : paradas;
  }
  const dx = side === 'left' ? -1 : 1;
  const puentes = placements.filter((p) =>
    p.orientation === 'horizontal' && (side === 'left' ? Math.sign(p.x - p.x2) : Math.sign(p.x2 - p.x)) === dx
  );
  return puentes.length > 0 ? puentes : placements;
}

export function straightestPlacement(board, placements, side, layout = DEFAULT_LAYOUT) {
  if (!placements || placements.length === 0) return null;
  // La primera ficha se pone para que la cadena SALGA A LO LARGO de la
  // pantalla del telefono, que es alta y angosta (§170). La cadena sale por el
  // eje de una ficha suelta, pero por los COSTADOS de un doble: por eso una
  // suelta va parada y un doble va acostado. Casi siempre abre un doble.
  //
  // (seccion 207) La mesa de verdad no siempre es alta: en el 1 vs 1 del
  // telefono, con la placa del rival arriba y la mano abajo, el paño libre es
  // casi cuadrado y un pelo mas ancho que alto. Si la ventana de la mesa es
  // ancha, la cadena sale a lo ancho.
  if (!board || board.length === 0) {
    const t = placements[0].tile;
    const esDoble = Array.isArray(t) && t[0] === t[1];
    const ventana = ventanaDe(layout);
    const aLoAncho = ventana.ancho >= ventana.alto;
    const buscada = esDoble === aLoAncho ? 'vertical' : 'horizontal';
    return placements.find((p) => p.orientation === buscada) || placements[0];
  }

  const grid = layout.grid;
  const endTile = side === 'left' ? board[0] : board[board.length - 1];
  const extremoEsDoble = endTile.tile[0] === endTile.tile[1];

  // Si el extremo es un doble, salir CRUZADO va primero, antes que cualquier
  // otro filtro. Un doble va acostado sobre la cadena, asi que la cadena sale
  // por sus costados, no por su mismo eje (ver contexto/README.md seccion 76).
  if (extremoEsDoble) {
    const cruzadas = placements.filter((p) => p.orientation !== endTile.orientation);
    if (cruzadas.length > 0) placements = cruzadas;
  }

  // SEGUIR DERECHO MANDA (seccion 167). Si se puede seguir en linea, se sigue;
  // la cadena solo dobla cuando choca con el borde. Antes iba primero el
  // "cerebro" (`aperturaFutura`) y doblaba en medio de la mesa cuando eso
  // dejaba el tablero mas abierto: se trababa un pelo menos (seccion 81) pero
  // la cadena se veia en escalera, y Raul la quiere recta. Lo que se pierde en
  // trabadas lo tapa el rescate y el destranque; lo que se gana es una mesa que
  // se lee de un vistazo.
  const dx = side === 'left' ? endTile.x - endTile.x2 : endTile.x2 - endTile.x;
  const dy = side === 'left' ? endTile.y - endTile.y2 : endTile.y2 - endTile.y;
  const ex = side === 'left' ? endTile.x : endTile.x2;
  const ey = side === 'left' ? endTile.y : endTile.y2;
  const cx = ex + dx;
  const cy = ey + dy;
  const cx2 = cx + dx;
  const cy2 = cy + dy;
  const rectas = extremoEsDoble
    ? placements.filter((p) => p.orientation !== endTile.orientation)
    : placements.filter((p) =>
        side === 'left'
          ? p.x === cx2 && p.y === cy2 && p.x2 === cx && p.y2 === cy
          : p.x === cx && p.y === cy && p.x2 === cx2 && p.y2 === cy2
      );
  // LA ESTRUCTURA DEL TELEFONO (§170), en este orden:
  //
  // 1. No salirse de la ventana: si hay casillas que caben en la pantalla del
  //    telefono y otras que no, se descartan las que no caben. Solo eso: se
  //    probo tambien "siempre la mas compacta" y "siempre parada" (columnas),
  //    y las dos alejan menos la camara pero traban la cadena 4 y 20 veces
  //    mas (ver la seccion 170, con los numeros).
  // 2. Seguir derecho, entre las que quedan: nada de escaleras.
  if (layout.camino === 'telefono') {
    // Mockup C (§175): el recorrido fijo manda; lo demas solo desempata.
    placements = preferirCamino(board, placements, side, layout);
  } else {
    placements = preferirCompactas(board, placements, ventanaDe(layout));
    // 1b. No pegarse a la propia cadena en el dibujo (§174).
    placements = preferirDespegadas(board, placements, side, layout);
    if (layout.camino === 'intermedio') {
      // Mockup B (§178): lo unico que se toma del camino fijo es doblar UNA
      // ficha antes de la pared. Si la recta deja la punta clavada en el
      // borde, la ficha siguiente ya no cabe derecha, un doble se planta de
      // canto y la cadena vuelve pegada a si misma. Con aire, dobla limpia.
      const conAire = placements.filter((p) => aireEnLaPunta(p, side, grid) > 0);
      if (conAire.length > 0 && conAire.length < placements.length) placements = conAire;
    }
  }
  const rectasCompactas = placements.filter((p) => rectas.includes(p));
  if (rectasCompactas.length > 0) placements = rectasCompactas;

  // Despues el cerebro: entre las que quedan gana la que deja mas abierto el
  // tablero para la jugada siguiente.
  if (placements.length > 1) {
    const aperturas = placements.map((p) => aperturaFutura(board, p, side, layout));
    const mejorApertura = Math.max(...aperturas);
    placements = placements.filter((p, i) => aperturas[i] === mejorApertura);
  }

  // No pegarse al borde.
  const mejorAire = Math.max(...placements.map((p) => aireEnLaPunta(p, side, grid)));
  placements = placements.filter((p) => aireEnLaPunta(p, side, grid) === mejorAire);
  if (placements.length === 1) return placements[0];

  // Entre las que quedan, la que deja mas sitio libre alrededor, para no
  // enroscarse (seccion 73).
  const espacios = placements.map((p) => espacioEnLaPunta(board, p, side, layout));
  const mejorEspacio = Math.max(...espacios);
  const finalistas = placements.filter((p, i) => espacios[i] === mejorEspacio);

  // Ultimo desempate: la que deja la cadena mas cerca del centro (seccion 88).
  if (finalistas.length === 1) return finalistas[0];
  const distancias = finalistas.map((p) => distanciaAlCentro(board, p, layout));

  return finalistas[distancias.indexOf(Math.min(...distancias))];
}

/**
 * Donde caeria la PROXIMA ficha en cada punta (seccion 207), dibujada en
 * celdas y con el corrimiento de los dobles. Es lo unico que la camara tiene
 * que reservar ademas de la cadena: antes se reservaban dos celdas por los
 * cuatro lados de cada punta, y en el telefono ese paño vacio achicaba las
 * fichas. Se prueba con una ficha suelta y con un doble, porque el doble se
 * planta cruzado y ocupa otro sitio. Devuelve un rectangulo por casilla.
 */
export function casillasQueVienen(board, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0) return [];
  const cell = layout.cell;
  const ends = boardEnds(board);
  const cajas = [];
  for (const side of ['left', 'right']) {
    const e = side === 'left' ? ends.left : ends.right;
    for (const tile of [[e, e === 6 ? 5 : 6], [e, e]]) {
      const opciones = placementsFor(board, tile, side, layout, null, { sinParedes: true });
      const p = straightestPlacement(board, opciones, side, layout);
      if (!p) continue;
      const r = rectOf(p, anchorOffsetFor(board, p, layout), cell);
      cajas.push({ side, x1: r.left / cell, y1: r.top / cell, x2: (r.left + r.width) / cell, y2: (r.top + r.height) / cell });
    }
  }
  return cajas;
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

// ---------------------------------------------------------------------------
// Destrancar: volver a trazar la cadena para que las puntas tengan sitio
// ---------------------------------------------------------------------------

/**
 * Las formas en que se puede volver a trazar la cadena.
 *
 * La SECUENCIA de fichas nunca cambia —el 6|3 sigue pegado al 3|4— y lo unico
 * que se recalcula es el camino sobre la rejilla. Cada forma es una manera de
 * preferir una casilla u otra cuando hay varias donde poner la siguiente ficha,
 * que es exactamente lo que hace que la cadena termine pareciendo un caracol,
 * una serpiente o un cuadrado.
 *
 * Se prueban en orden. Con la primera que deje las puntas con sitio, alcanza.
 */
export const FORMAS_DE_CADENA = ['compacta', 'recta', 'ancha', 'giro'];

const largoDe = (p) => (p.orientation === 'horizontal' ? 2 : 1);
const altoDe = (p) => (p.orientation === 'horizontal' ? 1 : 2);

/** La caja que ocuparia la cadena si se agregara `p`. */
const cajaCon = (board, p) => {
  let x1 = minX(p), x2 = maxX(p) + 1, y1 = minY(p), y2 = maxY(p) + 1;
  for (const t of board) {
    x1 = Math.min(x1, minX(t)); x2 = Math.max(x2, maxX(t) + 1);
    y1 = Math.min(y1, minY(t)); y2 = Math.max(y2, maxY(t) + 1);
  }
  return { ancho: x2 - x1, alto: y2 - y1 };
};

/** Hacia donde apunta una ficha, como vector unitario de su eje largo. */
const direccionDe = (p) => ({
  x: Math.sign(p.x2 - p.x),
  y: Math.sign(p.y2 - p.y)
});

/**
 * Cuanto "vale" poner la ficha en esa casilla, segun la forma buscada.
 * Menos es mejor: se ordena de menor a mayor.
 */
const puntuar = (forma, p, board, layout) => {
  const caja = cajaCon(board, p);
  const centro = layout.grid / 2;
  const cx = (minX(p) + maxX(p) + 1) / 2;
  const cy = (minY(p) + maxY(p) + 1) / 2;
  const alCentro = Math.abs(cx - centro) + Math.abs(cy - centro);

  if (forma === 'compacta') {
    // Cuadrada y apretada: crece lo menos posible por el lado que ya es mayor.
    return Math.max(caja.ancho, caja.alto) * 100 + (caja.ancho + caja.alto) * 10 + alCentro;
  }

  if (forma === 'ancha') {
    // Se estira a lo ancho, que es donde la pantalla del telefono tiene menos
    // sitio... pero a lo alto sobra: una cadena ancha y baja entra mejor.
    return caja.alto * 100 + caja.ancho * 10 + alCentro;
  }

  const anterior = board[board.length - 1];
  if (!anterior) return alCentro;

  const dAnt = direccionDe(anterior);
  const dNue = direccionDe(p);
  const sigueDerecho = dAnt.x === dNue.x && dAnt.y === dNue.y;

  // 'recta' prefiere seguir derecho; 'giro' prefiere doblar. Una hace serpientes
  // largas, la otra caracoles.
  const quiereDerecho = forma === 'recta';
  return (sigueDerecho === quiereDerecho ? 0 : 1000) + Math.max(caja.ancho, caja.alto) * 10 + alCentro;
};

/**
 * Vuelve a trazar la cadena entera con una forma distinta.
 *
 * Busca en profundidad con vuelta atras: prueba las casillas en el orden que
 * marca la forma y, si se mete en un callejon, deshace y prueba la siguiente.
 * El presupuesto de pasos evita que una cadena larga se quede pensando.
 *
 * @param secuencia las fichas ya orientadas, en orden, tal como estan en `board`
 * @returns un `board` nuevo, o null si con esa forma no se llega al final
 */
export function reconstruirCadena(secuencia, layout = DEFAULT_LAYOUT, forma = 'compacta', presupuesto = 20000) {
  if (!secuencia || secuencia.length === 0) return [];

  const board = [];
  let quedan = presupuesto;

  const paso = (i) => {
    if (i >= secuencia.length) return true;
    if (--quedan < 0) return false;

    const candidatas =
      i === 0
        ? placementsFor([], secuencia[0], 'first', layout)
        : placementsFor(board, secuencia[i], 'right', layout);

    const ordenadas = candidatas
      .map((p) => ({ p, valor: puntuar(forma, p, board, layout) }))
      .sort((a, b) => a.valor - b.valor)
      .map((c) => c.p);

    for (const p of ordenadas) {
      board.push(p);
      if (paso(i + 1)) return true;
      board.pop();
    }
    return false;
  };

  return paso(0) ? board : null;
}

/**
 * Las fichas de una mano que pegan con una punta pero no tienen donde caer.
 *
 * Es la definicion exacta de "trancado por el dibujo": la regla del domino dice
 * que la jugada es legal y el tablero dice que no hay sitio. En una mesa de
 * verdad esto no existe, porque los jugadores corren las fichas.
 */
export function jugadasSinSitio(board, mano, ends, layout = DEFAULT_LAYOUT) {
  if (!board || board.length === 0) return [];

  const sinSitio = [];
  mano.forEach((tile, tileIndex) => {
    for (const side of ['left', 'right']) {
      const end = side === 'left' ? ends.left : ends.right;
      if (tile[0] !== end && tile[1] !== end) continue;
      if (placementsFor(board, tile, side, layout).length === 0) {
        sinSitio.push({ tileIndex, tile, side });
      }
    }
  });
  return sinSitio;
}

/**
 * Busca un trazado nuevo donde las fichas que estaban sin sitio si entren.
 *
 * Prueba las formas una por una y se queda con la PRIMERA que destranca todas.
 * Si ninguna lo logra, devuelve null y el tablero se queda como esta: nunca se
 * cambia el dibujo para dejarlo igual de trancado.
 */
export function destrancarCadena(board, mano, ends, layout = DEFAULT_LAYOUT) {
  const atascadas = jugadasSinSitio(board, mano, ends, layout);
  if (atascadas.length === 0) return null;

  const secuencia = board.map((t) => t.tile);
  const trazados = [];
  for (const forma of FORMAS_DE_CADENA) {
    const nuevo = reconstruirCadena(secuencia, layout, forma);
    if (nuevo && nuevo.length === board.length) trazados.push({ board: nuevo, forma });
  }

  // Primero, lo bonito: una forma donde TODAS las jugadas de la mano caben
  // dentro de la mesa. Antes solo se miraba que se liberaran las que estaban
  // tapadas, y a veces el reacomodo tapaba otra (seccion 206).
  for (const t of trazados) {
    if (jugadasSinSitio(t.board, mano, ends, layout).length === 0) return t;
  }

  // Si ninguna cabe entera, la ultima salida (fuera de la pared) ya deja jugar
  // todo lo que no esta ENCERRADO por la propia culebra. Solo se reacomoda si
  // en el trazado de ahora hay alguna jugada sin ninguna salida, y solo hacia
  // una forma donde no quede ninguna asi.
  const sinSalida = (b) => mano.some((tile) => ['left', 'right'].some((side) => {
    const end = side === 'left' ? ends.left : ends.right;
    if (tile[0] !== end && tile[1] !== end) return false;
    return placementsFor(b, tile, side, layout, null, { sinParedes: true }).length === 0;
  }));
  if (!sinSalida(board)) return null;
  for (const t of trazados) {
    if (!sinSalida(t.board)) return t;
  }

  return null;
}
