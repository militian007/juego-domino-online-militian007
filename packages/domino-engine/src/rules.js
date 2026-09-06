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
  if (!cfg.hasPool && cfg.seats * cfg.tilesPerPlayer !== totalTiles) {
    cfg.hasPool = true;
  }
  return cfg;
}

export function teamOfSeat(seat, cfg) {
  return cfg.teams ? (seat % 2 === 0 ? 1 : 2) : seat === 0 ? 1 : 2;
}

export function teamsFor(cfg) {
  const out = [];
  for (let s = 0; s < cfg.seats; s++) out.push(teamOfSeat(s, cfg));
  return out;
}
