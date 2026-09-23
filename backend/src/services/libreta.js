/**
 * LA LIBRETA DE LA PARTIDA (seccion 201, ficha 7.2 de la plantilla).
 *
 * Cuando alguien dice «me robaron», el socio necesita poder contar la partida
 * jugada por jugada sin estar ahi. Eso es la libreta: quien se sento en que
 * silla, cada ficha que se puso, cada pase, cada robo, cada vez que se acabo el
 * reloj y cada caida de conexion, con su hora.
 *
 * Vive EN MEMORIA y guarda las ultimas partidas (como el chat de la mesa): una
 * disputa se reclama el mismo dia. Cuando haga falta guardarla de verdad, la
 * tabla va aqui sin tocar el resto.
 *
 * Lo que sale por la pantalla del socio es un REPORTE COPIABLE: se pega en el
 * chat y de ahi sale el arreglo, como en el truco.
 */
const CUANTAS = 30;

/** code -> libreta */
const libretas = new Map();
/** Los codigos, del mas viejo al mas nuevo, para tirar los que sobran. */
const orden = [];

const hora = (ms) => new Date(ms).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const pinta = (ficha) => (Array.isArray(ficha) ? `${ficha[0]}-${ficha[1]}` : String(ficha ?? ''));

export function abrir(room) {
  const libreta = {
    code: room.code,
    modo: room.mode,
    modalidad: room.modalidad,
    puntos: room.puntos,
    empezoEn: Date.now(),
    termino: null,
    jugadores: room.players.map((p) => ({
      silla: p.asiento ?? room.players.indexOf(p),
      nombre: p.username,
      casa: Boolean(p.isBot),
      id: String(p.id),
      nivel: p.difficulty ?? null
    })),
    sucesos: []
  };
  libretas.set(room.code, libreta);
  orden.push(room.code);
  while (orden.length > CUANTAS) libretas.delete(orden.shift());
  return libreta;
}

export function anotar(code, texto, quien = null) {
  const libreta = libretas.get(code);
  if (!libreta) return;
  libreta.sucesos.push({ cuando: Date.now(), texto, quien });
  if (libreta.sucesos.length > 500) libreta.sucesos.shift();
}

/** Traduce los eventos del motor a renglones en criollo. */
export function anotarDelMotor(code, room, desdeSeq = 0) {
  const libreta = libretas.get(code);
  if (!libreta || !room.game?.state?.events) return;
  const nombre = (seat) => room.players[seat]?.username ?? `silla ${seat}`;
  for (const e of room.game.state.events) {
    if (e.seq <= (libreta.ultimoSeq ?? desdeSeq)) continue;
    libreta.ultimoSeq = e.seq;
    if (e.kind === 'DEAL') anotar(code, `Se reparte la ronda ${e.round}.`);
    else if (e.kind === 'PLAY_TILE') anotar(code, `${nombre(e.seat)} pone la ${pinta(e.tile)} por la ${e.side === 'left' ? 'izquierda' : 'derecha'} (le quedan ${e.handCount}).`, nombre(e.seat));
    else if (e.kind === 'DRAW') anotar(code, `${nombre(e.seat)} levanta del pozo.`, nombre(e.seat));
    else if (e.kind === 'PASS') anotar(code, `${nombre(e.seat)} pasa.`, nombre(e.seat));
    else if (e.kind === 'TIMEOUT') anotar(code, `Se le acabó el tiempo a ${nombre(e.seat)}: la mesa jugó por él.`, nombre(e.seat));
    else if (e.kind === 'FORFEIT') anotar(code, `${nombre(e.seat)} abandonó.`, nombre(e.seat));
    else if (e.kind === 'ROUND_END') anotar(code, `Fin de la ronda ${e.round}: ${e.reason === 'blocked' ? 'trancada' : 'se pegó'}, ${e.points ?? 0} puntos para el equipo ${e.team ?? '?'}.`);
    else if (e.kind === 'GAME_END') anotar(code, `Fin de la partida: gana el equipo ${e.winnerTeam ?? '?'}.`);
  }
}

export function cerrar(code, marcador) {
  const libreta = libretas.get(code);
  if (!libreta) return;
  libreta.termino = Date.now();
  libreta.marcador = marcador ?? null;
}

export const de = (code) => libretas.get(String(code).toUpperCase()) ?? null;

export const listar = () =>
  orden
    .slice()
    .reverse()
    .map((code) => {
      const l = libretas.get(code);
      return l && {
        code: l.code,
        modo: l.modo,
        modalidad: l.modalidad,
        puntos: l.puntos,
        empezoEn: new Date(l.empezoEn).toISOString(),
        termino: l.termino ? new Date(l.termino).toISOString() : null,
        jugadores: l.jugadores.map((j) => j.nombre),
        personas: l.jugadores.filter((j) => !j.casa).length,
        sucesos: l.sucesos.length
      };
    })
    .filter(Boolean);

/** El reporte copiable: lo que el socio pega en el chat. */
export function reporte(code) {
  const l = de(code);
  if (!l) return null;
  const lineas = [];
  lineas.push(`LIBRETA DE LA PARTIDA ${l.code} · dominó`);
  lineas.push(`${l.modo === '1v1' ? '1 vs 1' : '2 vs 2'} · ${l.modalidad} · a ${l.puntos} puntos`);
  lineas.push(`Empezó ${hora(l.empezoEn)}${l.termino ? ` · terminó ${hora(l.termino)}` : ' · sin terminar'}`);
  lineas.push('');
  lineas.push('EN LA MESA');
  for (const j of l.jugadores) lineas.push(`  silla ${j.silla}: ${j.nombre}${j.casa ? ` (la casa, ${j.nivel ?? 'casa'})` : ''}`);
  if (l.marcador) lineas.push(`  marcador final: ${l.marcador[1] ?? 0} a ${l.marcador[2] ?? 0}`);
  lineas.push('');
  lineas.push('LO QUE PASÓ');
  for (const s of l.sucesos) lineas.push(`  ${hora(s.cuando)} · ${s.texto}`);
  lineas.push('');
  lineas.push('LA PLATA');
  lineas.push('  Sin apuestas: el dominó todavía no toca dinero.');
  return `${lineas.join('\n')}\n`;
}

export function __limpiarParaPruebas() {
  libretas.clear();
  orden.length = 0;
}
