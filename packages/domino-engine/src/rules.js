import { DEFAULT_LAYOUT } from './layout.js';

export const BASE_RULES = {
  maxPip: 6,
  tilesPerPlayer: 7,
  targetPoints: 100,
  hasPool: true,
  teams: true,
  seats: 4,
  layout: DEFAULT_LAYOUT,
  firstRoundStarter: 'highest-double',
  nextRoundStarter: 'winner',
  // En el tranque gana el equipo con menos pips y suma los pips que le quedaron
  // al rival. 'difference' (restar los propios) queda disponible como variante.
  blockedScoring: 'total',

  /**
   * Como se puntua (§128).
   *
   *   'clasico' → solo al cerrar la ronda. Es el domino venezolano de siempre.
   *   'cincos'  → ademas, cada vez que la suma de las DOS PUNTAS es multiplo de
   *               cinco, el que acaba de jugar se anota esa suma. Es el "All
   *               Fives", y cambia el juego entero: ya no se trata solo de
   *               quedarte sin fichas, sino de dejar las puntas en 5, 10, 15...
   */
  scoring: 'clasico',

  /**
   * A que multiplo se redondean los puntos de la ronda. 0 = no se redondea.
   *
   * En el "Cinco" todo el marcador va de cinco en cinco, asi que los pips del
   * perdedor tambien: 23 pips son 25 puntos, 22 son 20. Con el redondeo en 0
   * —lo de siempre— se suman tal cual.
   */
  redondeoDeRonda: 0,

  // Cuanto dura un turno. El motor NO cuenta el tiempo: no tiene relojes por
  // dentro a proposito, porque tiene que dar siempre el mismo resultado con la
  // misma semilla. Este numero es el que le dice a quien SI tiene reloj (el
  // servidor) cuanto esperar, y al que dibuja, cuanto falta.
  turnMs: 30000,

  // Que pasa cuando se acaba el tiempo:
  //
  //   'auto-play' → se juega solo por el jugador (lo de siempre)
  //   'skip-turn' → se le pasa el turno al siguiente y ya
  //
  // Jonathan lo quiere en 'skip-turn' para las partidas entre personas.
  //
  // Primero se hizo que perdiera la ronda y que sus fichas se contaran como
  // puntos del rival, y el mismo lo corrigio: *"no es lo mismo que me de todos
  // sus puntos... que una persona no juegue un turno es suficiente
  // penalizacion"*. Tiene razon: perder la ronda entera por dormirse un turno
  // decide la partida por un descuido.
  //
  // En las partidas contra la maquina no se usa reloj.
  timeoutRule: 'auto-play',

  /**
   * Destrancar: si el dibujo le veta una jugada legal a alguien, se vuelve a
   * trazar la cadena para hacerle sitio.
   *
   * La regla del domino dice que la ficha va en un extremo o en el otro, y ya.
   * Pero la cadena se dibuja sobre una rejilla y se enrolla sobre si misma:
   * medido sobre 91.821 situaciones de partidas jugadas de verdad, en el 0,88%
   * hay una ficha que pega y no tiene donde caer. En una mesa real los
   * jugadores corren las fichas; aca las corre el motor.
   *
   * No cambia la secuencia de fichas ni las puntas ni las manos: solo el camino
   * sobre la rejilla. Va en `config` y no fijo en el codigo porque la plataforma
   * tiene que poder apagarlo (regla 7 del motor).
   */
  destrancar: true
};

export const FORMATS = {
  'domino-1v1-v1': {
    label: '1 vs 1',
    seats: 2,
    teams: false,
    hasPool: true,
    tilesPerPlayer: 7,
    targetPoints: 100
  },
  'domino-1v1bot-v1': {
    label: '1 vs Bot',
    seats: 2,
    teams: false,
    hasPool: true,
    tilesPerPlayer: 7,
    targetPoints: 100,
    botSeats: [1]
  },
  'domino-2v2-v1': {
    label: '2 vs 2',
    seats: 4,
    teams: true,
    hasPool: false,
    tilesPerPlayer: 7,
    targetPoints: 100
  },
  'domino-2v2bots-v1': {
    label: '2 vs 2 (con bots)',
    seats: 4,
    teams: true,
    hasPool: false,
    tilesPerPlayer: 7,
    targetPoints: 100,
    botSeats: [1, 3]
  }
};

export function resolveConfig(gameFormat, overrides = {}) {
  const preset = FORMATS[gameFormat];
  if (!preset) {
    throw new Error(`gameFormat desconocido: ${gameFormat}. Válidos: ${Object.keys(FORMATS).join(', ')}`);
  }
  const cfg = { ...BASE_RULES, ...preset, ...overrides };
  cfg.layout = { ...DEFAULT_LAYOUT, ...(overrides.layout || preset.layout || {}) };
  cfg.botSeats = (overrides.botSeats || preset.botSeats || []).slice();
  delete cfg.label;

  const totalTiles = ((cfg.maxPip + 1) * (cfg.maxPip + 2)) / 2;
  if (cfg.seats * cfg.tilesPerPlayer > totalTiles) {
    throw new Error(`No alcanzan las fichas: ${cfg.seats} x ${cfg.tilesPerPlayer} > ${totalTiles}`);
  }
  // Sin pozo y sin repartir todas las fichas es la TRANCA (§128): se reparte y
  // lo que sobra se queda fuera de la mano. Si no se pide a proposito, se
  // enciende el pozo: un formato al que le faltan fichas y no tiene de donde
  // sacarlas casi seguro es un error de configuracion, no una modalidad.
  if (!cfg.hasPool && cfg.seats * cfg.tilesPerPlayer !== totalTiles
      && overrides.hasPool !== false) {
    cfg.hasPool = true;
  }
  return cfg;
}

/**
 * Las tres modalidades que se pueden elegir (§128), como sobreescrituras de
 * `config`. Van aqui y no en `FORMATS` porque son ortogonales: cualquiera de
 * ellas vale tanto en 1v1 como en 2v2.
 */
export const MODALIDADES = {
  pozo: {
    label: 'Con pozo',
    descripcion: 'Si no podés jugar, levantás del montón hasta poder.',
    overrides: { hasPool: true, scoring: 'clasico', redondeoDeRonda: 0 }
  },
  tranca: {
    label: 'Tranca',
    descripcion: 'Sin montón: el que no puede jugar, pasa.',
    overrides: { hasPool: false, scoring: 'clasico', redondeoDeRonda: 0 }
  },
  cinco: {
    label: 'Cinco',
    descripcion: 'Sumás cada vez que las dos puntas dan 5, 10, 15...',
    // A 200 y no a 100, y el numero esta medido (§128). En esta modalidad el
    // 68% del marcador se gana JUGANDO, asi que a 100 la partida se acaba en
    // 3 rondas. A 200 dura 7, que es lo mismo que el clasico.
    overrides: { hasPool: true, scoring: 'cincos', redondeoDeRonda: 5, targetPoints: 200 }
  }
};

export function overridesDeModalidad(nombre) {
  const m = MODALIDADES[nombre];
  return m ? { ...m.overrides } : {};
}

export function teamOfSeat(seat, cfg) {
  return cfg.teams ? (seat % 2 === 0 ? 1 : 2) : seat === 0 ? 1 : 2;
}

export function teamsFor(cfg) {
  const out = [];
  for (let s = 0; s < cfg.seats; s++) out.push(teamOfSeat(s, cfg));
  return out;
}
