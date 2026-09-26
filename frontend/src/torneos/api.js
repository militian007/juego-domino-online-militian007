import api from '../services/api.js';
import { connectSocket, idDeInvitado } from '../services/socket.js';
import { identidad } from '../umbral/identidad.js';
import * as demo from './demo.js';

/**
 * EL ADAPTADOR DE TORNEOS: la unica puerta de las pantallas de torneo al
 * servidor. Las pantallas hablan con la forma del truco (TournamentsScreen,
 * TournamentDetailScreen...) y aqui se traduce el contrato del domino
 * (contexto/API-TORNEOS.md, seccion 211): rutas `/api/torneos`, las del socio
 * en `/api/socio/torneos` y los eventos `tournament:*`.
 *
 * `?demo=torneos` enciende datos de muestra en todas las pantallas (queda en
 * la pestana hasta `?demo=0`), para verlas sin backend. Solo si se pide.
 */

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const LLAVE_DEMO = 'domino-torneos-demo';

export function modoDemo() {
  try {
    const pedido = new URLSearchParams(window.location.search).get('demo');
    if (pedido === 'torneos') sessionStorage.setItem(LLAVE_DEMO, '1');
    if (pedido === '0') sessionStorage.removeItem(LLAVE_DEMO);
    return sessionStorage.getItem(LLAVE_DEMO) === '1';
  } catch {
    return false;
  }
}

export const EVENTOS = {
  mesaLista: 'tournament:table_ready',
  actualizado: 'tournament:updated',
  armando: 'tournament:armando',
  llegasteTarde: 'tournament:llegaste_tarde',
  podio: 'tournament:podium',
  recordatorio: 'tournament:recordatorio',
  mesaCerrada: 'tournament:mesa_cerrada'
};

/** La mesa de torneo se abre como cualquier mesa a la que te invitan: entrar ES presentarse. */
export const rutaDeMesa = (code) => `/game?join=${encodeURIComponent(code)}`;

/** Con que id aparezco en el cuadro: la cuenta, o el invitado de este telefono. */
export function miId(user) {
  if (modoDemo()) return demo.YO;
  if (user?.id != null) return String(user.id);
  return idDeInvitado();
}

/** El error del servidor en palabras, para el aviso. */
export function mensajeDeError(err, porDefecto = 'No se pudo') {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || porDefecto;
}

/**
 * QUIEN SOY, por REST: la cuenta va sola (el token lo pone services/api.js);
 * el invitado manda su identidad ligera en cabeceras, las mismas del socket.
 */
function cabeceras() {
  try {
    if (localStorage.getItem('token')) return {};
  } catch { /* sin almacenamiento */ }
  const id = idDeInvitado();
  if (!id) return {};
  const yo = identidad();
  const h = { 'X-Guest-Id': id };
  // Las cabeceras solo llevan latin-1: un nombre con otras letras no viaja (el servidor pide nombre para anotarse).
  if (yo?.nombre && /^[ -ÿ]+$/.test(yo.nombre)) h['X-Guest-Name'] = yo.nombre;
  if (yo?.retrato) h['X-Guest-Retrato'] = yo.retrato;
  return h;
}

const pedir = (ruta, params) => api.get(ruta, { params, headers: cabeceras() }).then((r) => r.data);
const mandar = (ruta, body) => api.post(ruta, body ?? {}, { headers: cabeceras() }).then((r) => r.data);

/* --------------------------------------------------------- normalizacion */

const lista = (x) => (Array.isArray(x) ? x : []);
const texto = (x) => (x == null ? null : String(x));
const premiosDe = (p) => (Array.isArray(p) ? p.map(Number) : p ? [p.campeon, p.segundo, p.tercero].filter((x) => x != null).map(Number) : []);

/** Un Torneo del contrato, con los nombres del truco que usan las pantallas. */
function torneoDeLista(t = {}) {
  const ventana = t.ventana ?? {};
  return {
    id: String(t.id),
    name: t.nombre ?? 'Torneo',
    status: t.estado ?? 'registration',
    tipo: t.tipo,
    startAt: t.empiezaEn,
    capacity: t.cupo ?? 16,
    minPlayers: t.minimo ?? 2,
    cuadroMinimo: t.cuadroMinimo ?? null,
    inscripcionTope: null,
    registeredCount: t.inscritos ?? 0,
    anotados: t.anotados ?? t.inscritos ?? 0,
    anotado: Boolean(t.anotado),
    esRelampago: Boolean(t.esRelampago),
    armandoHasta: ventana.abierta ? ventana.hasta : null,
    targetPoints: t.puntos ?? 24,
    premiosPuntos: premiosDe(t.premios),
    conBots: Boolean(t.relleno),
    endedAt: t.terminadoEn ?? null,
    campeon: t.campeon ?? null
  };
}

function normalizarDetalle(d) {
  const players = lista(d.jugadores).map((p) => ({
    userId: String(p.userId),
    displayName: p.username ?? '—',
    isBot: Boolean(p.esBot),
    retrato: p.avatar ?? null,
    status: p.estado ?? 'registered',
    siembra: p.siembra ?? null
  }));
  // Los del cuadro que no esten en la lista (no deberia pasar) igual tienen nombre.
  for (const c of lista(d.cuadro)) {
    for (const p of [c.a, c.b]) {
      if (p && !players.some((x) => x.userId === String(p.userId))) {
        players.push({ userId: String(p.userId), displayName: p.username ?? '—', isBot: Boolean(p.esBot), retrato: p.avatar ?? null, status: 'registered' });
      }
    }
  }
  const me = d.me ?? {};
  return {
    tournament: torneoDeLista(d.torneo),
    registeredCount: d.torneo?.inscritos ?? players.filter((p) => p.status === 'registered').length,
    anotados: d.anotados ?? null,
    rondas: d.rondas ?? 0,
    players,
    bracket: lista(d.cuadro).map((c) => ({
      id: String(c.id),
      round: c.ronda,
      slot: c.slot,
      playerAUserId: texto(c.a?.userId),
      playerBUserId: texto(c.b?.userId),
      winnerUserId: texto(c.ganadorId),
      status: c.estado,
      motivo: c.motivo ?? null,
      nextMatchId: texto(c.siguienteId),
      finalScores: c.marcador ? [c.marcador.a, c.marcador.b] : null,
      presentationDeadlineAt: c.mesa?.empezada ? null : c.plazoEn ?? null,
      playingTableId: c.mesa?.code ?? null,
      presentes: c.presentes ?? null,
      tercerPuesto: Boolean(c.tercerPuesto),
      seriesWins: { a: 0, b: 0 },
      mesa: c.mesa ?? null
    })),
    payouts: lista(d.podio).map((p) => ({ place: p.puesto, userId: String(p.userId), displayName: p.username, puntos: p.puntos, retrato: p.avatar ?? null, isBot: Boolean(p.esBot) })),
    tercerPuesto: d.tercerPuesto ? { ganadorUserId: texto(d.tercerPuesto.ganadorId), perdedorUserId: texto(d.tercerPuesto.perdedorId) } : null,
    armado: d.armado ? { abierto: Boolean(d.armado.abierta), hasta: d.armado.hasta ?? null, segunda: Boolean(d.armado.segunda) } : null,
    me: {
      registered: Boolean(me.registered),
      registrationStatus: me.registrationStatus ?? null,
      puertaHasta: me.puertaHasta ?? null,
      tableId: me.code ?? null,
      cruce: me.cruce ?? null
    }
  };
}

/** Las mesas en vivo de un torneo, con la forma del `live` del truco. */
function normalizarVivo(v) {
  return {
    avgGameSeconds: null,
    tables: lista(v?.mesas).map((m) => ({
      matchId: String(m.cruceId),
      tableId: m.code,
      started: Boolean(m.empezada),
      tableCreatedAt: null,
      scores: m.marcador ? [m.marcador.a, m.marcador.b] : null,
      roundNumber: m.mano ?? null,
      espectadores: m.espectadores ?? 0
    }))
  };
}

/* ---------------------------------------------------------- del jugador */

export const torneos = {
  async lista() {
    if (modoDemo()) return demo.lista();
    const r = await pedir('/torneos');
    const porId = new Map();
    for (const t of [...lista(r.torneos), ...lista(r.relampago?.serie)]) {
      const n = torneoDeLista(t);
      porId.set(n.id, { ...porId.get(n.id), ...n });
    }
    return [...porId.values()];
  },
  async palmares({ days = 7, limit = 8, offset = 0 } = {}) {
    if (modoDemo()) return demo.palmares(offset, limit);
    const r = await pedir('/torneos/palmares', { dias: days, limite: limit, desde: offset });
    return {
      items: lista(r.items).map((p) => ({
        id: String(p.id),
        name: p.nombre,
        endedAt: p.terminadoEn,
        champion: p.campeon?.username ?? '—',
        championIsBot: Boolean(p.campeon?.esBot),
        championRetrato: p.campeon?.avatar ?? null,
        podio: lista(p.podio).map((q) => ({ place: q.puesto, name: q.username, isBot: Boolean(q.esBot) })),
        puntos: lista(p.podio).find((q) => q.puesto === 1)?.puntos ?? 0
      })),
      hasMore: Boolean(r.hayMas)
    };
  },
  async detalle(id) {
    if (modoDemo()) return demo.detalle(id);
    return normalizarDetalle(await pedir(`/torneos/${id}`));
  },
  async vivo(id) {
    if (modoDemo()) return demo.vivo(id);
    return normalizarVivo(await pedir(`/torneos/${id}/vivo`));
  },
  async anotarme(id) {
    if (modoDemo()) return demo.anotarme(id);
    return mandar(`/torneos/${id}/register`);
  },
  async borrarme(id) {
    if (modoDemo()) return demo.borrarme(id);
    return mandar(`/torneos/${id}/unregister`);
  },
  /** «Voy — guardenme el puesto»: corre el plazo de presentarse, una vez por cruce. */
  async voy(id) {
    if (modoDemo()) return { ok: true, prorrogaMinutos: 3 };
    return mandar(`/torneos/${id}/voy`);
  },
  /** «No voy a poder»: cede el cruce y el rival pasa en el acto. */
  async noVoy(id) {
    if (modoDemo()) return { ok: true };
    return mandar(`/torneos/${id}/no-voy`);
  },
  /** La puerta abierta: el que quedo fuera entra contra un directo. */
  async entrarTarde(id) {
    if (modoDemo()) return { ok: true };
    try {
      return await mandar(`/torneos/${id}/entrar-tarde`);
    } catch (err) {
      const d = err?.response?.data;
      if (d && d.ok === false) return d;
      throw err;
    }
  },
  async misTitulos() {
    if (modoDemo()) return demo.titulos();
    const r = await pedir('/torneos/mis-titulos');
    return { items: lista(r.items).map((t) => ({ id: String(t.id), name: t.nombre, endedAt: t.terminadoEn, puntos: t.puntos })) };
  },
  /**
   * Mi mesa de torneo en curso, si tengo una (la banda «tu mesa te espera»):
   * de mis torneos en juego, el detalle dice mi mesa viva (`me.code`).
   */
  async miMesa() {
    if (modoDemo()) return demo.miMesa();
    const mios = await pedir('/torneos/mios');
    for (const t of lista(mios.torneos).filter((x) => x.estado === 'live' && x.miEstado === 'registered')) {
      const d = await pedir(`/torneos/${t.id}`);
      if (d?.me?.code) {
        const plazo = d.me.cruce?.plazoEn && !d.me.cruce?.presente ? new Date(d.me.cruce.plazoEn).getTime() : null;
        return { mesa: { tableId: d.me.code, tournamentId: String(t.id), torneoNombre: t.nombre, hastaMs: plazo } };
      }
    }
    return { mesa: null };
  }
};

/* -------------------------------------------------------------- sockets */

/** Escucha un evento de torneo; devuelve la funcion para dejar de escuchar. */
export function escuchar(evento, fn) {
  if (modoDemo()) return demo.escuchar(evento, fn);
  const socket = connectSocket();
  if (!socket) return () => {};
  socket.on(evento, fn);
  return () => socket.off(evento, fn);
}

/**
 * Mira una mesa de torneo en SOLO LECTURA: `table:spectate { code }` y el
 * servidor contesta `table:spectator_state { code, vista, mesa }` con el
 * tablero y las manos tapadas. `mesa` es el mismo estado que recibe la
 * partida (nombres, marcador, ultima jugada) y `vista` el del motor (turno por
 * asiento, fase, layout). Nunca se manda una accion.
 */
export function mirarMesa(tableId, { alEstado, alError }) {
  if (modoDemo()) return demo.mirarMesa(tableId, alEstado);
  const socket = connectSocket();
  if (!socket) { alError?.('Sin conexión'); return () => {}; }
  const code = String(tableId).toUpperCase();
  const alLlegar = (p) => {
    if (String(p?.code ?? '').toUpperCase() !== code) return;
    const vista = p.vista ?? {};
    const mesa = p.mesa ?? {};
    alEstado({ ...vista, ...mesa, layout: mesa.layout ?? vista.layout, turn: vista.turn, phase: vista.phase }, null);
  };
  const empezar = () => socket.emit('table:spectate', { code }, (r) => { if (r && r.ok === false) alError?.(r.error || 'No se pudo mirar la mesa'); });
  socket.on('table:spectator_state', alLlegar);
  socket.on('connect', empezar);
  if (socket.connected) empezar();
  return () => {
    socket.emit('table:unspectate', { code });
    socket.off('table:spectator_state', alLlegar);
    socket.off('connect', empezar);
  };
}

/* ------------------------------------------------ el cuarto del socio */

async function pedirSocio(llave, ruta, { method = 'GET', body } = {}) {
  const r = await fetch(`${API}/socio/torneos${ruta}`, {
    method,
    headers: { 'X-Llave': llave, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'No se pudo');
  return j;
}

const hhmm = (h, m) => `${String(h ?? 0).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
const partir = (s) => {
  const x = /^(\d{1,2}):(\d{2})$/.exec(s ?? '');
  return x ? [Number(x[1]), Number(x[2])] : null;
};

/** La config del Relampago con los nombres de la tarjeta del socio. */
function relampagoParaLaTarjeta(c = {}) {
  return {
    on: Boolean(c.on),
    desdeHora: hhmm(c.desdeHora, c.desdeMinuto),
    hastaHora: hhmm(c.hastaHora, c.hastaMinuto),
    cadaMinutos: c.cadaMinutos ?? 30,
    anticipacionHoras: c.anticipacionHoras ?? 48,
    desdeFecha: c.desdeFecha ?? null,
    hastaFecha: c.hastaFecha ?? null,
    targetPoints: c.puntos ?? 24,
    cuadroMinimo: c.cuadroMinimo ?? 16,
    botNivel: c.botNivel ?? 'casa',
    premiosPuntos: premiosDe(c.premios)
  };
}

function cambiosParaElServidor(c) {
  const out = {};
  for (const [k, v] of Object.entries(c)) {
    if (k === 'desdeHora' || k === 'hastaHora') {
      const p = partir(v);
      if (!p) continue;
      out[k] = p[0];
      out[k === 'desdeHora' ? 'desdeMinuto' : 'hastaMinuto'] = p[1];
    } else if (k === 'targetPoints') out.puntos = Number(v);
    else if (k === 'premiosPuntos') out.premios = { campeon: Number(v[0]) || 0, segundo: Number(v[1]) || 0, tercero: Number(v[2]) || 0 };
    else out[k] = v;
  }
  return out;
}

export function torneosDelSocio(llave) {
  const d = modoDemo();
  const listaDelSocio = async () => ({ torneos: lista((await pedirSocio(llave, '/')).torneos).map(torneoDeLista) });
  const relampago = async () => {
    const [r, l] = await Promise.all([pedirSocio(llave, '/relampago'), listaDelSocio()]);
    return {
      config: relampagoParaLaTarjeta(r.relampago),
      proximaFranja: r.relampago?.proximaFranja ?? null,
      publicados: l.torneos.filter((t) => t.esRelampago && t.status === 'registration').sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).map((t) => ({ id: t.id, startAt: t.startAt }))
    };
  };
  return {
    relampago: () => (d ? demo.relampago() : relampago()),
    guardarRelampago: async (cambios) => {
      if (d) return demo.guardarRelampago(cambios);
      await pedirSocio(llave, '/relampago', { method: 'PUT', body: cambiosParaElServidor(cambios) });
      return relampago();
    },
    lista: () => (d ? demo.listaDelSocio() : listaDelSocio()),
    crear: (c) => (d ? demo.crear(c) : pedirSocio(llave, '/', {
      method: 'POST',
      body: { nombre: c.name, empiezaEn: c.startAt, puntos: c.targetPoints, cupo: c.capacity, relleno: c.botFill, cuadroMinimo: c.botFill ? c.cuadroMinimo ?? undefined : undefined, botNivel: c.botNivel, premios: c.premiosPuntos }
    })),
    cancelar: (id) => (d ? demo.cancelar(id) : pedirSocio(llave, `/${id}/cancel`, { method: 'POST' })),
    rellenarConBots: (id) => (d ? demo.rellenar(id) : pedirSocio(llave, `/${id}/fill-bots`, { method: 'POST', body: {} })),
    walkover: (id, matchId, ganadorId) => (d ? demo.ok() : pedirSocio(llave, `/${id}/matches/${matchId}/walkover`, { method: 'POST', body: { ganadorId } })),
    relanzar: (id, matchId) => (d ? demo.ok() : pedirSocio(llave, `/${id}/matches/${matchId}/relaunch`, { method: 'POST', body: {} })),
    detalle: (id) => (d ? demo.detalle(id) : torneos.detalle(id))
  };
}
