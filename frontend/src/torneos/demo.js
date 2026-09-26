import {
  createGame,
  applyAction,
  viewFor,
  spectatorView,
  currentSeat,
  chooseAction
} from '@privoytruco/domino-engine';
import { identidad } from '../umbral/identidad.js';

/**
 * DATOS DE MUESTRA (`?demo=torneos`): una noche de Relampago de verdad para
 * ver todas las pantallas sin backend. Un Relampago de 16 en cuartos con dos
 * mesas en juego, la serie de la noche, un torneo del socio abierto, el
 * palmares y los titulos. Las mesas que se miran corren con el motor real.
 */

export const YO = 'demo-yo';
const MIN = 60000;
const MEDIA_HORA = 30 * MIN;

const nombreMio = () => identidad()?.nombre || 'Tú';

const hora = (ms) => new Date(ms).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
const iso = (ms) => new Date(ms).toISOString();

const JUGADORES = [
  [YO, null, false, 'tigre'],
  ['p-cheo', 'Cheo', false, 'chuo'],
  ['p-petra', 'Petra', false, 'paula'],
  ['b-ramon', 'Don Ramón', true, null],
  ['p-gordis', 'El Gordis', false, 'pancho'],
  ['p-yubi', 'Yubi', false, 'yubi'],
  ['p-catire', 'Catire', false, 'catire'],
  ['b-negra', 'La Negra', true, null],
  ['p-chuo', 'Chuo', false, 'nano'],
  ['p-zurda', 'La Zurda', false, 'zurda'],
  ['p-musiu', 'Musiú', false, 'musiu'],
  ['b-compadre', 'Compadre', true, null],
  ['p-pancho', 'Pancho', false, 'comadre'],
  ['p-nano', 'Nano', false, 'nano'],
  ['p-juana', 'Juana', false, 'juana'],
  ['b-profe', 'El Profe', true, null]
];

function jugadores() {
  return JUGADORES.map(([userId, nombre, isBot, retrato]) => ({
    userId,
    displayName: userId === YO ? nombreMio() : nombre,
    isBot,
    retrato,
    status: 'registered'
  }));
}

/* ------------------------------------------------------------ la noche */

let base = Math.floor(Date.now() / MEDIA_HORA) * MEDIA_HORA;
const anotadosPorMi = new Set();
const borradosPorMi = new Set();

function serie() {
  const out = [];
  for (let i = -1; i <= 7; i++) {
    const t = base + i * MEDIA_HORA;
    const id = i === -1 ? 'demo-rel-fin' : i === 0 ? 'demo-rel-vivo' : `demo-rel-${i}`;
    const status = i === -1 ? 'completed' : i === 0 ? 'live' : 'registration';
    const anotadoBase = i === 2;
    const anotado = (anotadoBase || anotadosPorMi.has(id)) && !borradosPorMi.has(id);
    const gente = i === 0 || i === -1 ? 16 : Math.max(0, 7 - i * 2) + (anotado ? 1 : 0);
    out.push({
      id,
      name: i === 0 ? 'El Relámpago 8:00 p. m.' : `El Relámpago ${hora(t)}`,
      status,
      startAt: iso(t),
      capacity: 16,
      minPlayers: 2,
      registeredCount: i === 3 ? 16 : gente,
      anotado,
      esRelampago: true,
      armandoHasta: null,
      targetPoints: 24,
      premiosPuntos: [100, 50, 25],
      conBots: true
    });
  }
  return out;
}

const COPA = () => ({
  id: 'demo-copa',
  name: 'Copa del Sábado',
  status: 'registration',
  startAt: iso(base + 2 * 24 * 60 * MIN + 7 * 60 * MIN),
  capacity: 32,
  minPlayers: 8,
  registeredCount: 9 + (anotadosPorMi.has('demo-copa') ? 1 : 0),
  anotado: anotadosPorMi.has('demo-copa'),
  esRelampago: false,
  armandoHasta: null,
  targetPoints: 100,
  premiosPuntos: [300, 150, 75],
  conBots: false
});

export async function lista() {
  return [...serie(), COPA()].filter((t) => t.status !== 'completed');
}

/* ------------------------------------------------------------- el cuadro */

function match(id, round, slot, a, b, extra = {}) {
  return {
    id,
    round,
    slot,
    playerAUserId: a,
    playerBUserId: b,
    winnerUserId: null,
    status: a && b ? 'ready' : 'pending',
    nextMatchId: null,
    finalScores: null,
    presentationDeadlineAt: null,
    playingTableId: null,
    tercerPuesto: false,
    seriesWins: { a: 0, b: 0 },
    ...extra
  };
}

function gano(m, quien, marcador) {
  m.winnerUserId = quien;
  m.status = 'completed';
  m.finalScores = marcador;
  return m;
}

/** El cuadro del Relampago en vivo: ronda 1 cerrada, cuartos a medias. */
function cuadroEnVivo() {
  const ids = JUGADORES.map((j) => j[0]);
  const r1 = [];
  for (let s = 0; s < 8; s++) r1.push(match(`r1s${s}`, 1, s, ids[2 * s], ids[2 * s + 1], { nextMatchId: `r2s${s >> 1}` }));
  gano(r1[0], YO, [24, 13]);
  gano(r1[1], 'p-petra', [24, 20]);
  gano(r1[2], 'p-gordis', [24, 8]);
  gano(r1[3], 'b-negra', [22, 24]);
  gano(r1[4], 'p-zurda', [15, 24]);
  gano(r1[5], 'p-musiu', [24, 19]);
  gano(r1[6], 'p-nano', null);
  gano(r1[7], 'p-juana', [24, 21]);

  const r2 = [
    gano(match('r2s0', 2, 0, YO, 'p-petra', { nextMatchId: 'r3s0' }), YO, [24, 19]),
    match('r2s1', 2, 1, 'p-gordis', 'b-negra', { nextMatchId: 'r3s0', status: 'playing', playingTableId: 'demo-mesa-r2s1' }),
    gano(match('r2s2', 2, 2, 'p-zurda', 'p-musiu', { nextMatchId: 'r3s1' }), 'p-zurda', [24, 16]),
    match('r2s3', 2, 3, 'p-nano', 'p-juana', { nextMatchId: 'r3s1', status: 'playing', playingTableId: 'demo-mesa-r2s3' })
  ];
  const r3 = [
    match('r3s0', 3, 0, YO, null, { nextMatchId: 'r4s0' }),
    match('r3s1', 3, 1, 'p-zurda', null, { nextMatchId: 'r4s0' })
  ];
  const r4 = [match('r4s0', 4, 0, null, null), match('r4s1', 4, 1, null, null, { tercerPuesto: true })];
  return [...r1, ...r2, ...r3, ...r4];
}

/** El cuadro del Relampago terminado: gane yo, Petra segunda, La Zurda tercera. */
function cuadroTerminado() {
  const c = cuadroEnVivo();
  const m = Object.fromEntries(c.map((x) => [x.id, x]));
  gano(m.r2s1, 'p-gordis', [24, 17]);
  m.r2s1.playingTableId = null;
  gano(m.r2s3, 'p-juana', [11, 24]);
  m.r2s3.playingTableId = null;
  m.r3s0.playerBUserId = 'p-gordis';
  gano(m.r3s0, YO, [24, 22]);
  m.r3s1.playerBUserId = 'p-juana';
  gano(m.r3s1, 'p-juana', [18, 24]);
  m.r4s0.playerAUserId = YO;
  m.r4s0.playerBUserId = 'p-juana';
  gano(m.r4s0, YO, [24, 14]);
  m.r4s1.playerAUserId = 'p-gordis';
  m.r4s1.playerBUserId = 'p-zurda';
  gano(m.r4s1, 'p-zurda', [20, 24]);
  return c;
}

export async function detalle(id) {
  const t = [...serie(), COPA()].find((x) => x.id === id) ?? serie()[1];
  const players = jugadores();
  const nombre = (uid) => players.find((p) => p.userId === uid)?.displayName;

  if (t.status === 'live') {
    return {
      tournament: t,
      registeredCount: 16,
      anotados: 16,
      players,
      bracket: cuadroEnVivo(),
      payouts: [],
      tercerPuesto: null,
      me: { registered: true, userId: YO, tableId: null, puertaHasta: null }
    };
  }
  if (t.status === 'completed') {
    return {
      tournament: t,
      registeredCount: 16,
      anotados: 16,
      players,
      bracket: cuadroTerminado(),
      payouts: [
        { place: 1, userId: YO, displayName: nombre(YO), puntos: 100 },
        { place: 2, userId: 'p-juana', displayName: 'Juana', puntos: 50 },
        { place: 3, userId: 'p-zurda', displayName: 'La Zurda', puntos: 25 }
      ],
      tercerPuesto: { ganadorUserId: 'p-zurda', perdedorUserId: 'p-gordis' },
      me: { registered: true, userId: YO, tableId: null }
    };
  }
  const anotados = players.filter((p) => !p.isBot && p.userId !== YO).slice(0, Math.max(0, t.registeredCount - (t.anotado ? 1 : 0)));
  if (t.anotado) anotados.unshift(players[0]);
  return {
    tournament: t,
    registeredCount: t.registeredCount,
    players: anotados,
    bracket: [],
    payouts: [],
    me: { registered: t.anotado, userId: YO, tableId: null }
  };
}

export async function vivo(id) {
  if (id !== 'demo-rel-vivo') return { avgGameSeconds: 420, tables: [] };
  const ahora = Date.now();
  return {
    avgGameSeconds: 7 * 60,
    tables: [
      { matchId: 'r2s1', tableId: 'demo-mesa-r2s1', started: true, tableCreatedAt: iso(ahora - 4 * MIN), scores: [18, 11], roundNumber: 4 },
      { matchId: 'r2s3', tableId: 'demo-mesa-r2s3', started: true, tableCreatedAt: iso(ahora - 6 * MIN), scores: [9, 21], roundNumber: 5 }
    ]
  };
}

export async function anotarme(id) {
  anotadosPorMi.add(id);
  borradosPorMi.delete(id);
  return { ok: true };
}

export async function borrarme(id) {
  anotadosPorMi.delete(id);
  borradosPorMi.add(id);
  return { ok: true };
}

export async function palmares(offset = 0, limit = 8) {
  const podio = (a, b, c) => [
    { place: 1, name: a[0], isBot: a[1] },
    { place: 2, name: b[0], isBot: b[1] },
    { place: 3, name: c[0], isBot: c[1] }
  ];
  const items = [
    { id: 'demo-rel-fin', name: `El Relámpago ${hora(base - MEDIA_HORA)}`, endedAt: iso(Date.now() - 6 * MIN), champion: nombreMio(), championIsBot: false, championRetrato: 'tigre', podio: podio([nombreMio(), false], ['Juana', false], ['La Zurda', false]), puntos: 100 },
    { id: 'demo-p2', name: `El Relámpago ${hora(base - 2 * MEDIA_HORA)}`, endedAt: iso(Date.now() - 38 * MIN), champion: 'Petra', championIsBot: false, championRetrato: 'paula', podio: podio(['Petra', false], ['Don Ramón', true], ['Cheo', false]), puntos: 100 },
    { id: 'demo-p3', name: `El Relámpago ${hora(base - 3 * MEDIA_HORA)}`, endedAt: iso(Date.now() - 71 * MIN), champion: 'La Negra', championIsBot: true, championRetrato: null, podio: podio(['La Negra', true], ['El Gordis', false], ['Yubi', false]), puntos: 100 },
    { id: 'demo-p4', name: 'Copa del Jueves', endedAt: iso(Date.now() - 2 * 24 * 60 * MIN), champion: 'Musiú', championIsBot: false, championRetrato: 'musiu', podio: podio(['Musiú', false], ['Catire', false], ['Chela', false]), puntos: 300 },
    { id: 'demo-p5', name: `El Relámpago ${hora(base - 5 * MEDIA_HORA)}`, endedAt: iso(Date.now() - 3 * 24 * 60 * MIN), champion: 'Juana', championIsBot: false, championRetrato: 'juana', podio: podio(['Juana', false], ['Nano', false], ['Compadre', true]), puntos: 100 }
  ];
  return { items: items.slice(offset, offset + limit), hasMore: offset + limit < items.length };
}

export async function titulos() {
  return {
    items: [
      { id: 'demo-rel-fin', name: `El Relámpago ${hora(base - MEDIA_HORA)}`, endedAt: iso(Date.now() - 6 * MIN) },
      { id: 'demo-t2', name: 'El Relámpago 9:30 p. m.', endedAt: iso(Date.now() - 3 * 24 * 60 * MIN) },
      { id: 'demo-t3', name: 'Copa del Jueves', endedAt: iso(Date.now() - 9 * 24 * 60 * MIN) }
    ]
  };
}

export async function miMesa() {
  const pedida = new URLSearchParams(window.location.search).get('banda');
  if (pedida !== '1') return { mesa: null };
  return { mesa: { tableId: 'demo-mesa-r2s1', tournamentId: 'demo-rel-vivo', torneoNombre: 'El Relámpago 8:00 p. m.', hastaMs: Date.now() + 42000 } };
}

/* -------------------------------------------------- los avisos de muestra */

const oyentes = new Map();

export function escuchar(evento, fn) {
  if (!oyentes.has(evento)) oyentes.set(evento, new Set());
  oyentes.get(evento).add(fn);
  return () => oyentes.get(evento)?.delete(fn);
}

/** `?aviso=armando|tarde|puerta|mesa` dispara el aviso de muestra al cargar. */
let avisoDisparado = false;
export function dispararAvisoDeMuestra() {
  const pedido = new URLSearchParams(window.location.search).get('aviso');
  if (!pedido || avisoDisparado) return;
  avisoDisparado = true;
  const emitir = (evento, payload) => oyentes.get(evento)?.forEach((fn) => fn(payload));
  const hasta = iso(Date.now() + 60000);
  setTimeout(() => {
    if (pedido === 'armando') emitir('tournament:armando', { tournamentId: 'demo-rel-1', hasta, parejas: false });
    if (pedido === 'tarde') emitir('tournament:llegaste_tarde', { tournamentId: 'demo-rel-1', motivo: 'ausente', proximoId: 'demo-rel-2' });
    if (pedido === 'puerta') emitir('tournament:llegaste_tarde', { tournamentId: 'demo-rel-vivo', motivo: 'ausente', puertaAbierta: true, proximoId: null });
    if (pedido === 'mesa') emitir('tournament:table_ready', { tournamentId: 'demo-rel-vivo', tableId: 'demo-mesa-r3s0', deadlineAt: iso(Date.now() + 180000), rivalName: 'El Gordis', quedan: 4, round: 3, totalRondas: 4 });
  }, 900);
}

/* ------------------------------------------------ la mesa que se mira */

const MESAS = {
  'demo-mesa-r2s1': { nombres: ['El Gordis', 'La Negra'], marcador: [18, 11], ronda: 4 },
  'demo-mesa-r2s3': { nombres: ['Nano', 'Juana'], marcador: [9, 21], ronda: 5 }
};

function unPaso(st) {
  const seat = currentSeat(st);
  if (seat == null) return st;
  const accion = chooseAction(viewFor(st, seat));
  if (!accion) return st;
  const r = applyAction(st, accion);
  return r.ok ? r.state : st;
}

function vistaDeMuestra(st, mesa) {
  const v = spectatorView(st);
  return { ...v, scores: { 1: mesa.marcador[0], 2: mesa.marcador[1] }, round: mesa.ronda, targetPoints: 24 };
}

export function mirarMesa(tableId, alEstado) {
  const mesa = MESAS[tableId] ?? MESAS['demo-mesa-r2s1'];
  let st = createGame({
    gameFormat: 'domino-1v1-v1',
    config: { targetPoints: 24 },
    seed: `demo-${tableId}`,
    players: mesa.nombres.map((name, i) => ({ id: `s${i}`, name }))
  });
  for (let i = 0; i < 9 && st.phase === 'playing'; i++) st = unPaso(st);
  const players = mesa.nombres.map((displayName, seat) => ({ seat, displayName }));
  setTimeout(() => alEstado(vistaDeMuestra(st, mesa), players), 250);
  const id = setInterval(() => {
    if (st.phase !== 'playing' || st.board.length > 16) return;
    st = unPaso(st);
    alEstado(vistaDeMuestra(st, mesa), players);
  }, 2600);
  return () => clearInterval(id);
}

/* --------------------------------------------------- el cuarto del socio */

const hhmm = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

let relampagoCfg = {
  on: true,
  desdeHora: hhmm(base - 4 * MEDIA_HORA),
  hastaHora: hhmm(base + 7 * MEDIA_HORA),
  cadaMinutos: 30,
  anticipacionHoras: 24,
  desdeFecha: '2026-09-01',
  hastaFecha: '2026-12-31',
  targetPoints: 24,
  cuadroMinimo: 8,
  rellenarConBots: true,
  premiosPuntos: [100, 50, 25]
};

export async function relampago() {
  const proximos = serie().filter((t) => t.status === 'registration');
  return { config: { ...relampagoCfg }, proximaFranja: proximos[0]?.startAt ?? null, publicados: proximos.map((t) => ({ id: t.id, startAt: t.startAt })) };
}

export async function guardarRelampago(cambios) {
  relampagoCfg = { ...relampagoCfg, ...cambios };
  return relampago();
}

let delSocio = null;
export async function listaDelSocio() {
  if (!delSocio) delSocio = [...serie(), COPA()];
  return { tournaments: delSocio };
}

export async function crear(cuerpo) {
  await listaDelSocio();
  const t = {
    id: `demo-nuevo-${Date.now()}`,
    name: cuerpo.name,
    status: 'registration',
    startAt: cuerpo.startAt,
    capacity: cuerpo.capacity,
    minPlayers: 2,
    registeredCount: 0,
    anotado: false,
    esRelampago: false,
    targetPoints: cuerpo.targetPoints,
    premiosPuntos: cuerpo.premiosPuntos,
    conBots: cuerpo.botFill
  };
  delSocio = [t, ...delSocio];
  return { tournament: t };
}

export async function cancelar(id) {
  await listaDelSocio();
  delSocio = delSocio.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t));
  return { ok: true };
}

export async function rellenar(id) {
  await listaDelSocio();
  delSocio = delSocio.map((t) => (t.id === id ? { ...t, registeredCount: t.capacity, conBots: true } : t));
  return { ok: true };
}

export async function ok() {
  return { ok: true };
}
