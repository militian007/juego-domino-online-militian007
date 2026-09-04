/**
 * Los bots rompe-juegos.
 *
 * Uso:
 *   node tools/romper.mjs                 -> 500 partidas de cada formato
 *   node tools/romper.mjs 5000            -> 5000 partidas de cada uno
 *   node tools/romper.mjs 5000 domino-1v1-v1
 *
 * ## Para que sirve
 *
 * Los tests normales comprueban que lo que se acaba de arreglar funciona. Esto
 * hace lo contrario: juega miles de partidas **buscando el fallo**, y despues
 * de CADA jugada comprueba una lista de cosas que nunca pueden pasar. La idea
 * es encontrar los errores antes de que los vea Jonathan jugando.
 *
 * ## Por que se puede
 *
 * Porque el motor es determinista: todo el azar sale de una `seed`. Cuando un
 * bot rompe algo, queda la semilla y el numero de jugada, asi que el fallo se
 * reproduce exacto las veces que haga falta. Sin eso, un error encontrado al
 * azar es casi imposible de volver a ver.
 *
 * ## Los bots no juegan para ganar
 *
 * Juegan para hacer combinaciones raras: el que siempre elige la primera
 * opcion, el que siempre elige la ultima, el que va al azar, el que se
 * obsesiona con los dobles, el que juega la ficha de mas pips. Un bot que
 * juega bien recorre siempre las mismas situaciones; estos recorren las
 * situaciones incomodas, que es donde se rompen las cosas.
 */
import {
  createGame, applyAction, legalActions, currentSeat, isTerminal, viewFor,
  ACTION, PHASE, serialize, deserialize, computeBoardOffsets, rectOf,
  boardEnds, DEFAULT_LAYOUT, generateSet, tileKey
} from '../src/index.js';

/* ==========================================================================
   LOS BOTS QUE ROMPEN
   ========================================================================== */

/** Azar reproducible: la misma semilla da siempre la misma partida. */
function dado(semilla) {
  let s = 0;
  for (let i = 0; i < semilla.length; i++) s = (s * 31 + semilla.charCodeAt(i)) | 0;

  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const PERSONALIDADES = {
  'siempre-la-primera': (acciones) => acciones[0],
  'siempre-la-ultima': (acciones) => acciones[acciones.length - 1],
  'al-azar': (acciones, tirar) => acciones[Math.floor(tirar() * acciones.length)],

  /** Se obsesiona con los dobles: son los que mas geometria rara producen. */
  'obsesionado-con-dobles': (acciones) => {
    const dobles = acciones.filter(
      (a) => a.type === ACTION.PLAY && a.tile && a.tile[0] === a.tile[1]
    );
    return dobles.length > 0 ? dobles[0] : acciones[0];
  },

  /** Suelta primero las fichas pesadas: deja manos raras al final. */
  'suelta-lo-pesado': (acciones) => {
    const jugadas = acciones.filter((a) => a.type === ACTION.PLAY && a.tile);
    if (jugadas.length === 0) return acciones[0];

    return jugadas.reduce((mejor, a) =>
      a.tile[0] + a.tile[1] > mejor.tile[0] + mejor.tile[1] ? a : mejor
    );
  },

  /** Roba siempre que puede: estira las manos hasta donde el motor aguante. */
  'roba-todo-lo-que-puede': (acciones) => {
    const robar = acciones.find((a) => a.type === ACTION.DRAW);
    return robar ?? acciones[0];
  }
};

/* ==========================================================================
   LO QUE NUNCA PUEDE PASAR
   ==========================================================================
   Cada una devuelve null si esta todo bien, o el texto del fallo.
   ========================================================================== */

const CELL = DEFAULT_LAYOUT.cell;

function seMontan(a, b) {
  const sx = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const sy = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return sx > 0.5 && sy > 0.5;
}

const REGLAS = {
  'las 28 fichas siempre estan': (state) => {
    const todas = [
      ...state.board.map((t) => tileKey(t.tile)),
      ...state.hands.flat().map(tileKey),
      ...state.pool.map(tileKey)
    ];
    const esperadas = generateSet(state.config.maxPip).length;

    if (todas.length !== esperadas) {
      return `hay ${todas.length} fichas en juego y tendrian que ser ${esperadas}`;
    }
    if (new Set(todas).size !== todas.length) return 'hay una ficha repetida';

    return null;
  },

  'ninguna ficha se sale del tablero': (state) => {
    const grid = state.config.layout.grid;

    for (const t of state.board) {
      const fuera =
        Math.min(t.x, t.x2) < 0 || Math.max(t.x, t.x2) >= grid ||
        Math.min(t.y, t.y2) < 0 || Math.max(t.y, t.y2) >= grid;

      if (fuera) return `la ficha ${tileKey(t.tile)} quedo en (${t.x},${t.y}) fuera de ${grid}x${grid}`;
    }

    return null;
  },

  'ninguna ficha se monta sobre otra': (state) => {
    if (state.board.length < 2) return null;

    const offsets = computeBoardOffsets(state.board, state.config.layout);
    const rects = state.board.map((t, i) => rectOf(t, offsets[i] ?? { x: 0, y: 0 }, CELL));

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (seMontan(rects[i], rects[j])) {
          return `${tileKey(state.board[i].tile)} y ${tileKey(state.board[j].tile)} se montan`;
        }
      }
    }

    return null;
  },

  'ningun doble queda en linea con su vecina': (state) => {
    // Un doble acostado siguiendo la cadena no existe en una mesa de verdad.
    // Jonathan lo marco dos veces con capturas. La comprobacion mira la
    // GEOMETRIA y no la orientacion: desde que el doble puede doblar en la
    // punta, un doble al costado tiene la misma orientacion que su vecina y
    // esta perfectamente cruzado. Lo que no puede es ir detras, en la misma
    // fila o columna.
    const board = state.board || [];
    const esDoble = (t) => t.tile[0] === t.tile[1];

    for (let i = 1; i < board.length; i++) {
      const a = board[i - 1];
      const b = board[i];
      if (a.orientation !== b.orientation) continue;

      // Se mira la que se puso DESPUES, por el numero de jugada. Un doble bien
      // cruzado puede quedar en linea con una ficha que vino mucho mas tarde
      // por su costado corto, y eso no es culpa de como se coloco el doble.
      const nueva = (a.seq ?? 0) > (b.seq ?? 0) ? a : b;
      if (!esDoble(nueva)) continue;

      const enLinea = a.orientation === 'vertical'
        ? Math.min(a.x, a.x2) === Math.min(b.x, b.x2)
        : Math.min(a.y, a.y2) === Math.min(b.y, b.y2);

      if (enLinea) return `el doble ${JSON.stringify(nueva.tile)} se coloco en linea con la cadena`;
    }
    return null;
  },

  'la cadena engancha de verdad': (state) => {
    for (let i = 1; i < state.board.length; i++) {
      const izq = state.board[i - 1];
      const der = state.board[i];
      if (izq.tile[1] !== der.tile[0]) {
        return `${tileKey(izq.tile)} no engancha con ${tileKey(der.tile)}`;
      }
    }

    return null;
  },

  'las puntas que dice el motor son las de verdad': (state) => {
    if (state.board.length === 0) return null;

    const reales = boardEnds(state.board);
    if (state.ends.left !== reales.left || state.ends.right !== reales.right) {
      return `dice puntas ${state.ends.left}/${state.ends.right} y son ${reales.left}/${reales.right}`;
    }

    return null;
  },

  'nadie ve la mano de otro': (state) => {
    // Se compara la ESTRUCTURA, no el texto.
    //
    // El primer intento buscaba la ficha como texto dentro de la vista y daba
    // falso positivo: "[1,2]" aparecia en "teams":[1,2], que es la lista de
    // equipos. Buscar fichas por substring en un JSON encuentra cualquier par
    // de numeros.
    for (let s = 0; s < state.hands.length; s++) {
      const vista = viewFor(state, s);

      const propia = JSON.stringify(state.hands[s]);
      if (JSON.stringify(vista.hand) !== propia) {
        return `el asiento ${s} no recibe su propia mano`;
      }

      // Ningun campo puede traer una mano ajena MIENTRAS SE JUEGA.
      //
      // Al cerrar la ronda si se muestran todas: es de donde sale el desglose
      // del puntaje, y va tanto en `revealedHands` como en el evento ROUND_END.
      // Eso es a proposito. Lo que no puede pasar es verlas con la ronda en
      // curso, que es cuando esa informacion da ventaja.
      // Con la ronda en juego, las manos reveladas tienen que estar vacias.
      if (state.phase === PHASE.PLAYING && vista.revealedHands) {
        return `el asiento ${s} ve las manos reveladas con la ronda en juego`;
      }

      if (state.phase !== PHASE.PLAYING) continue;

      // Del historial de eventos solo se mira la ronda que se esta jugando.
      //
      // Los ROUND_END de rondas viejas traen las manos con las que se cerro
      // cada una, y eso es publico: ahi se vio el desglose del puntaje. Sin
      // este filtro salta un falso positivo cuando a alguien le queda una sola
      // ficha y esa ficha ya figuraba en las sobras de una ronda anterior.
      const campos = { ...vista };
      if (Array.isArray(campos.events)) {
        campos.events = campos.events.filter((e) => e.round === state.round);
      }

      for (const [campo, valor] of Object.entries(campos)) {
        if (campo === 'hand') continue;
        if (!Array.isArray(valor)) continue;

        for (let otro = 0; otro < state.hands.length; otro++) {
          if (otro === s) continue;
          if (state.hands[otro].length === 0) continue;

          // ¿Hay dentro de este campo un array identico a la mano ajena?
          const ajena = JSON.stringify(state.hands[otro]);
          if (JSON.stringify(valor).includes(ajena)) {
            return `el campo "${campo}" del asiento ${s} trae la mano del asiento ${otro}`;
          }
        }
      }

    }

    return null;
  },

  'los puntajes nunca son negativos': (state) => {
    for (const [equipo, puntos] of Object.entries(state.scores)) {
      if (puntos < 0) return `el equipo ${equipo} tiene ${puntos} puntos`;
    }

    return null;
  },

  'el estado sobrevive a guardarlo y leerlo': (state) => {
    try {
      const ida = serialize(state);
      const vuelta = deserialize(typeof ida === 'string' ? ida : JSON.stringify(ida));
      if (!vuelta) return 'al leerlo de vuelta no devolvio nada';

      if (vuelta.board.length !== state.board.length) {
        return 'la cadena cambio de largo al guardarlo y leerlo';
      }
    } catch (e) {
      return `rompio al guardarlo: ${e.message}`;
    }

    return null;
  },

  'si hay jugada legal, no se puede pasar': (state) => {
    if (state.phase !== PHASE.PLAYING) return null;

    const seat = currentSeat(state);
    if (seat == null) return null;

    const acciones = legalActions(state, seat);
    const puedeJugar = acciones.some((a) => a.type === ACTION.PLAY);
    const puedePasar = acciones.some((a) => a.type === ACTION.PASS);

    if (puedeJugar && puedePasar) {
      return `el asiento ${seat} puede jugar y ademas pasar`;
    }

    return null;
  },

  'siempre hay algo que hacer': (state) => {
    if (isTerminal(state)) return null;

    const seat = currentSeat(state);
    if (seat == null) return null;

    if (legalActions(state, seat).length === 0) {
      return `el asiento ${seat} no tiene ninguna accion legal y la partida sigue`;
    }

    return null;
  }
};

/* ==========================================================================
   LA PARTIDA
   ========================================================================== */

function jugarUna(formato, semilla, personalidad, fallos) {
  const tirar = dado(semilla);
  let state = createGame({ gameFormat: formato, seed: semilla });
  let jugada = 0;

  const revisar = (momento) => {
    for (const [nombre, regla] of Object.entries(REGLAS)) {
      let motivo;
      try {
        motivo = regla(state);
      } catch (e) {
        motivo = `la comprobacion exploto: ${e.message}`;
      }

      if (motivo) {
        fallos.push({ regla: nombre, motivo, formato, semilla, personalidad, jugada, momento });
        return false;
      }
    }
    return true;
  };

  if (!revisar('al repartir')) return;

  while (!isTerminal(state) && jugada < 600) {
    const seat = currentSeat(state);
    if (seat == null) break;

    const acciones = legalActions(state, seat);
    if (acciones.length === 0) break;

    // Antes de jugar legal, se prueba una accion inventada: el motor tiene que
    // rechazarla sin romperse ni cambiar nada.
    if (jugada % 7 === 0) {
      const basura = { type: ACTION.PLAY, seat, tileIndex: 99, side: 'right' };
      let r;
      try {
        r = applyAction(state, basura);
      } catch (e) {
        fallos.push({
          regla: 'una accion invalida no puede romper el motor',
          motivo: `tiro una excepcion: ${e.message}`,
          formato, semilla, personalidad, jugada, momento: 'accion inventada'
        });
        return;
      }
      if (r.ok) {
        fallos.push({
          regla: 'una accion invalida tiene que ser rechazada',
          motivo: 'el motor acepto jugar la ficha numero 99',
          formato, semilla, personalidad, jugada, momento: 'accion inventada'
        });
        return;
      }
    }

    const elegir = PERSONALIDADES[personalidad];
    const accion = elegir(acciones, tirar) ?? acciones[0];

    let r;
    try {
      r = applyAction(state, accion);
    } catch (e) {
      fallos.push({
        regla: 'una accion legal no puede romper el motor',
        motivo: `${accion.type} tiro una excepcion: ${e.message}`,
        formato, semilla, personalidad, jugada, momento: 'al aplicar'
      });
      return;
    }

    if (!r.ok) {
      fallos.push({
        regla: 'una accion que el motor dijo que era legal tiene que poder aplicarse',
        motivo: `${accion.type} fue rechazada: ${r.error}`,
        formato, semilla, personalidad, jugada, momento: 'al aplicar'
      });
      return;
    }

    state = r.state;
    jugada++;

    if (!revisar(`despues de ${accion.type}`)) return;

    if (state.phase === PHASE.ROUND_OVER) {
      const sig = applyAction(state, { type: ACTION.START_NEXT_ROUND, seat });
      if (sig.ok) {
        state = sig.state;
        if (!revisar('al empezar la ronda nueva')) return;
      }
    }
  }

  if (jugada >= 600) {
    fallos.push({
      regla: 'la partida tiene que terminar',
      motivo: 'llego a 600 jugadas sin terminar',
      formato, semilla, personalidad, jugada, momento: 'al final'
    });
  }
}

/** El mismo azar dos veces tiene que dar exactamente la misma partida. */
function revisarDeterminismo(formato, semilla, fallos) {
  const jugar = () => {
    let state = createGame({ gameFormat: formato, seed: semilla });
    const huella = [];

    for (let i = 0; i < 40 && !isTerminal(state); i++) {
      const seat = currentSeat(state);
      if (seat == null) break;
      const acciones = legalActions(state, seat);
      if (acciones.length === 0) break;

      const r = applyAction(state, acciones[0]);
      if (!r.ok) break;
      state = r.state;
      huella.push(JSON.stringify(state.board));

      if (state.phase === PHASE.ROUND_OVER) {
        const sig = applyAction(state, { type: ACTION.START_NEXT_ROUND, seat });
        if (sig.ok) state = sig.state;
      }
    }

    return huella.join('|');
  };

  if (jugar() !== jugar()) {
    fallos.push({
      regla: 'la misma semilla tiene que dar la misma partida',
      motivo: 'dos partidas con la misma semilla salieron distintas',
      formato, semilla, personalidad: '-', jugada: '-', momento: 'determinismo'
    });
  }
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */

const porFormato = Number(process.argv[2] || 500);
const soloFormato = process.argv[3];
const formatos = soloFormato
  ? [soloFormato]
  : ['domino-1v1-v1', 'domino-2v2-v1'];

const personalidades = Object.keys(PERSONALIDADES);
const fallos = [];
let partidas = 0;

console.log('');
console.log(`  Bots rompe-juegos: ${porFormato} partidas por formato, ${personalidades.length} personalidades`);
console.log(`  Reglas que se comprueban despues de CADA jugada: ${Object.keys(REGLAS).length}`);
console.log('');

const arranque = Date.now();

for (const formato of formatos) {
  for (let i = 0; i < porFormato; i++) {
    const personalidad = personalidades[i % personalidades.length];
    jugarUna(formato, `romper-${formato}-${i}`, personalidad, fallos);
    partidas++;

    if (i % 50 === 0) revisarDeterminismo(formato, `det-${formato}-${i}`, fallos);
  }
}

const segundos = ((Date.now() - arranque) / 1000).toFixed(1);

console.log(`  ${partidas} partidas jugadas en ${segundos}s`);
console.log('');

if (fallos.length === 0) {
  console.log('  NINGUN FALLO. Los bots no pudieron romper nada.');
  console.log('');
  process.exit(0);
}

// Se agrupan por regla: veinte fallos de la misma causa son un fallo.
const porRegla = new Map();
for (const f of fallos) {
  if (!porRegla.has(f.regla)) porRegla.set(f.regla, []);
  porRegla.get(f.regla).push(f);
}

console.log(`  ${fallos.length} FALLOS, de ${porRegla.size} causa(s) distinta(s):`);
console.log('');

for (const [regla, lista] of porRegla) {
  const primero = lista[0];
  console.log(`  x ${regla}`);
  console.log(`    ${lista.length} veces. La primera:`);
  console.log(`      ${primero.motivo}`);
  console.log(`      formato ${primero.formato}, semilla "${primero.semilla}", bot "${primero.personalidad}"`);
  console.log(`      en la jugada ${primero.jugada}, ${primero.momento}`);
  console.log('');
}

console.log('  Para repetir un fallo exacto, usa su semilla: el motor es determinista.');
console.log('');
process.exit(1);
