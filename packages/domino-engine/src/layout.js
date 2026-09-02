export const DEFAULT_LAYOUT = { grid: 20, cell: 32 };

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

function joinOffset(prev, curr, prevOffset, cell) {
  const prevDouble = prev.tile[0] === prev.tile[1];
  const currDouble = curr.tile[0] === curr.tile[1];
  if (prev.orientation === curr.orientation || (!prevDouble && !currDouble)) {
    return { x: prevOffset.x, y: prevOffset.y };
  }
  const pc = center(prev, cell);
  const cc = center(curr, cell);
  const theDouble = currDouble ? curr : prev;
  if (theDouble.orientation === 'vertical') {
    return { x: prevOffset.x, y: prevOffset.y + pc.y - cc.y };
  }
  return { x: prevOffset.x + pc.x - cc.x, y: prevOffset.y };
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
        } else {
          const row = free.y + dy;
          addAlong('horizontal', { x: ex, y: row }, { x: ex - 1, y: row });
          addAlong('horizontal', { x: ex, y: row }, { x: ex + 1, y: row });
        }

        // Si cruzarse mas alla de la punta no entra —tipicamente porque la punta
        // quedo contra el borde de la mesa— el doble todavia puede entrar si la
        // cadena dobla ahi mismo: se cruza respecto de la direccion nueva, que es
        // perpendicular. Solo se ofrece como salida de emergencia para que el
        // doble siga viendose cruzado siempre que se pueda.
        if (out.length === 0) {
          if (endTile.orientation === 'horizontal') {
            for (const fila of [free.y - 1, free.y + 1]) {
              addAlong('horizontal', { x: free.x, y: fila }, { x: free.x - 1, y: fila });
              addAlong('horizontal', { x: free.x, y: fila }, { x: free.x + 1, y: fila });
            }
          } else {
            for (const col of [free.x - 1, free.x + 1]) {
              addAlong('vertical', { x: col, y: free.y }, { x: col, y: free.y - 1 });
              addAlong('vertical', { x: col, y: free.y }, { x: col, y: free.y + 1 });
            }
          }
        }
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

  // Rescate del doble. Un doble se cruza sobre la cadena, asi que sobresale y
  // toca la fila de al lado; la regla de "no rozar otra ficha" lo rechaza. Una
  // ficha normal, acostada, pasa por el mismo pasillo sin tocar nada. Resultado:
  // el jugador veia sitio de sobra, jugaba una normal ahi, y el doble no lo
  // dejaba. Medido: pasaba en el 0,45% de las posiciones.
  //
  // Si al doble no le queda NI UN sitio, se repasan las mismas casillas
  // permitiendo que roce. Solo se relaja rozar: solaparse y salirse del tablero
  // se siguen rechazando, asi que la ficha entra pegada pero nunca encima.
  if (esDoble && out.length === 0) {
    permitirRozar = true;
    if (diagnostico) diagnostico.push({ motivo: 'rescate-del-doble' });
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
export function straightestPlacement(board, placements, side, layout = DEFAULT_LAYOUT) {
  if (!placements || placements.length === 0) return null;
  if (!board || board.length === 0) return placements[0];

  const grid = layout.grid;
  const mejorAire = Math.max(...placements.map((p) => aireEnLaPunta(p, side, grid)));
  const candidatas = placements.filter((p) => aireEnLaPunta(p, side, grid) === mejorAire);
  placements = candidatas;
  const endTile = side === 'left' ? board[0] : board[board.length - 1];
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
  const rectas = placements.filter((p) =>
    side === 'left'
      ? p.x === cx2 && p.y === cy2 && p.x2 === cx && p.y2 === cy
      : p.x === cx && p.y === cy && p.x2 === cx2 && p.y2 === cy2
  );
  const pool = rectas.length > 0 ? rectas : placements;
  if (pool.length === 1) return pool[0];
  const espacios = pool.map((p) => espacioEnLaPunta(board, p, side, layout));
  const mejorEspacio = Math.max(...espacios);
  return pool[espacios.indexOf(mejorEspacio)];
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
