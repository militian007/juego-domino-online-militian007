import * as Torneo from '../../models/Torneo.js';
import * as torneos from '../torneos.js';
import { rondaFinalDe, esTercerPuesto } from './cuadro.js';
import { getRelampago, inicioDelDiaEnCaracas } from './relampago.js';

/**
 * LO QUE VE LA PANTALLA (seccion 211): la vitrina, el detalle con el cuadro y
 * los marcadores en vivo, el palmares y mis titulos. Solo lee; la forma de
 * cada respuesta esta en contexto/API-TORNEOS.md.
 *
 * VITRINA ABIERTA, como en el truco: todo esto se ve SIN identidad. Anotarse
 * si la pide.
 */

const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());

export function serializar(t, conteo = {}) {
  return {
    id: t.id,
    nombre: t.nombre,
    tipo: t.tipo,
    esRelampago: t.tipo === 'relampago',
    estado: t.estado,
    empiezaEn: iso(t.empiezaEn),
    puntos: t.puntos,
    cupo: t.cupo,
    minimo: t.minimo,
    relleno: t.relleno,
    cuadroMinimo: t.cuadroMinimo,
    botNivel: t.botNivel,
    premios: { campeon: t.premios[0], segundo: t.premios[1], tercero: t.premios[2] },
    conTercerPuesto: t.premios[2] > 0,
    inscritos: conteo.inscritos ?? 0,
    anotados: conteo.anotados ?? 0,
    terminadoEn: iso(t.terminadoEn),
    campeon: t.campeonId ? { userId: t.campeonId, username: t.campeonNombre, esBot: t.campeonBot } : null
  };
}

function ventanaDe(t, ahora) {
  const abierta = t.estado === Torneo.ESTADO.INSCRIPCION && ahora >= t.empiezaEn && torneos.aplicaPresentes(t);
  return { abierta, hasta: abierta ? iso(torneos.finDeVentanaDe(t)) : null, segunda: t.segundaHasta != null };
}

/** El marcador en vivo de una mesa (memoria del servidor). */
function enVivo(code) {
  const room = torneos.sala(code);
  if (!room) return { code, empezada: false, marcador: null, mano: null, espectadores: 0 };
  const scores = room.game?.teamScores ?? null;
  return {
    code,
    empezada: Boolean(room.started),
    marcador: scores ? { a: Number(scores[room.players[0]?.team ?? 0] ?? 0), b: Number(scores[room.players[1]?.team ?? 1] ?? 0) } : null,
    mano: room.game?.round ?? null,
    espectadores: room.espectadores?.size ?? 0
  };
}

/** GET /api/torneos: los que vienen, los que van, los recien terminados y la serie del Relampago. */
export async function vitrina(yoId, ahora = Date.now()) {
  const lista = await Torneo.vitrina(ahora - 48 * 3600_000);
  const conteos = await Torneo.conteos(lista.map((t) => t.id));
  const mias = new Set();
  if (yoId != null) {
    for (const f of await Torneo.inscripcionesDe(yoId, [Torneo.ESTADO.INSCRIPCION, Torneo.ESTADO.JUGANDO, Torneo.ESTADO.TERMINADO])) {
      if (f.miEstado === Torneo.INSCRIPCION.INSCRITO) mias.add(f.id);
    }
  }
  const salida = lista.map((t) => ({ ...serializar(t, conteos.get(t.id)), anotado: mias.has(t.id), ventana: ventanaDe(t, ahora) }));
  const cfg = await getRelampago();
  const inicio = inicioDelDiaEnCaracas(new Date(ahora)).getTime();
  const serie = await Torneo.relampagosEntre(inicio, inicio + 24 * 3600_000);
  const cs = await Torneo.conteos(serie.map((t) => t.id));
  const proxima = await torneos.proximaFranja(ahora).catch(() => null);
  const { items } = await Torneo.palmares({ desde: ahora - 7 * 24 * 3600_000, limite: 10 });
  return {
    torneos: salida,
    relampago: {
      on: cfg.on,
      proximaFranja: cfg.on && proxima ? proxima.toISOString() : null,
      serie: serie.map((t) => ({ ...serializar(t, cs.get(t.id)), anotado: mias.has(t.id) }))
    },
    // Lo que leia la pantalla vieja (Torneos.jsx), hasta que se rehaga.
    proximos: salida.filter((t) => t.estado === Torneo.ESTADO.INSCRIPCION).map((t) => ({ id: t.id, nombre: t.nombre, empiezaEn: t.empiezaEn, estado: 'anunciado', premioPuntos: t.premios.campeon, anotados: t.inscritos })),
    palmares: items.map(({ torneo: t }) => ({ torneoId: t.id, nombre: t.nombre, campeonId: t.campeonId, campeon: t.campeonNombre, premioPuntos: t.premios[0], terminadoEn: iso(t.terminadoEn) }))
  };
}

/** GET /api/torneos/:id: el torneo, la gente, el cuadro con marcadores y lo mio. */
export async function detalle(id, yoId, ahora = Date.now()) {
  const t = await Torneo.porId(id);
  if (!t) return null;
  const [regs, cs, mesas] = await Promise.all([Torneo.inscritos(t.id), Torneo.cruces(t.id), Torneo.mesasDelTorneo(t.id)]);
  const conteo = (await Torneo.conteos([t.id])).get(t.id);
  const persona = (uid) => {
    if (!uid) return null;
    const r = regs.find((x) => x.userId === uid);
    return { userId: uid, username: r?.username ?? '—', avatar: r?.avatar ?? null, esBot: Boolean(r?.esBot), siembra: r?.siembra ?? null };
  };
  const rondaFinal = rondaFinalDe(cs);
  const cuadro = cs.map((c) => {
    const viva = mesas.find((m) => m.cruceId === c.id && m.estado === 'playing');
    return {
      id: c.id,
      ronda: c.ronda,
      slot: c.slot,
      a: persona(c.a),
      b: persona(c.b),
      ganadorId: c.ganador,
      estado: c.estado,
      siguienteId: c.siguienteId,
      siguienteLado: c.siguienteLado,
      tercerPuesto: esTercerPuesto(c, rondaFinal),
      plazoEn: iso(c.plazoEn),
      presentes: { a: Boolean(c.presenteA), b: Boolean(c.presenteB) },
      segundaLlamada: c.segundaLlamada,
      motivo: c.motivo,
      marcador: c.marcadorA != null ? { a: c.marcadorA, b: c.marcadorB } : null,
      mesa: viva ? enVivo(viva.code) : null
    };
  });
  const tercer = cs.find((c) => esTercerPuesto(c, rondaFinal) && c.ganador);
  const mia = yoId != null ? regs.find((r) => r.userId === String(yoId)) ?? null : null;
  const miCruce = mia ? cs.find((c) => c.ganador == null && ['ready', 'playing'].includes(c.estado) && (c.a === mia.userId || c.b === mia.userId)) ?? null : null;
  const miMesa = miCruce ? mesas.find((m) => m.cruceId === miCruce.id && m.estado === 'playing') ?? null : null;
  let puertaHasta = null;
  if (mia && t.estado === Torneo.ESTADO.JUGANDO && torneos.aplicaPresentes(t) && [Torneo.INSCRIPCION.AUSENTE, Torneo.INSCRIPCION.SIN_CUPO].includes(mia.estado)) {
    const fin = torneos.finDePuertaDe(t);
    if (fin > ahora && fin > torneos.finDeVentanaDe(t)) puertaHasta = iso(fin);
  }
  return {
    torneo: serializar(t, conteo),
    rondas: Math.max(0, ...cs.map((c) => c.ronda)),
    jugadores: regs.map((r) => ({ userId: r.userId, username: r.username, avatar: r.avatar, esBot: r.esBot, estado: r.estado, siembra: r.siembra, puesto: r.puesto })),
    cuadro,
    tercerPuesto: tercer ? { ganadorId: tercer.ganador, perdedorId: tercer.ganador === tercer.a ? tercer.b : tercer.a } : null,
    podio: regs.filter((r) => r.puesto != null && r.puesto <= 3).sort((a, b) => a.puesto - b.puesto)
      .map((r) => ({ puesto: r.puesto, userId: r.userId, username: r.username, avatar: r.avatar, esBot: r.esBot, puntos: t.premios[r.puesto - 1] ?? 0 })),
    armado: ventanaDe(t, ahora),
    anotados: conteo?.anotados ?? 0,
    me: {
      registered: mia?.estado === Torneo.INSCRIPCION.INSCRITO,
      registrationStatus: mia?.estado ?? null,
      puertaHasta,
      code: miMesa?.code ?? null,
      cruce: miCruce ? {
        id: miCruce.id,
        ronda: miCruce.ronda,
        plazoEn: iso(miCruce.plazoEn),
        rival: persona(miCruce.a === mia.userId ? miCruce.b : miCruce.a),
        presente: Boolean(miCruce.a === mia.userId ? miCruce.presenteA : miCruce.presenteB),
        prorrogaUsada: miCruce.prorrogaEn != null,
        segundaLlamada: miCruce.segundaLlamada
      } : null
    }
  };
}

/** GET /api/torneos/:id/vivo: solo lo volatil (marcadores), para refrescar seguido. */
export async function vivo(id) {
  const t = await Torneo.porId(id);
  if (!t) return null;
  if (t.estado !== Torneo.ESTADO.JUGANDO) return { ahora: new Date().toISOString(), mesas: [] };
  const mesas = (await Torneo.mesasDelTorneo(t.id)).filter((m) => m.estado === 'playing');
  return { ahora: new Date().toISOString(), mesas: mesas.map((m) => ({ cruceId: m.cruceId, ...enVivo(m.code) })) };
}

/** GET /api/torneos/mesas-en-vivo: las mesas de torneo jugandose ahora, para mirar. */
export async function mesasEnVivo() {
  const mesas = await Torneo.mesasEnJuego();
  const nombres = new Map();
  for (const tid of new Set(mesas.map((m) => m.torneoId))) {
    for (const r of await Torneo.inscritos(tid)) nombres.set(`${tid}:${r.userId}`, r.username);
  }
  const maxRonda = new Map();
  for (const tid of new Set(mesas.map((m) => m.torneoId))) maxRonda.set(tid, Math.max(0, ...(await Torneo.cruces(tid)).map((c) => c.ronda)));
  return mesas
    .map((m) => ({
      ...enVivo(m.code),
      tournamentId: m.torneoId,
      tournamentName: m.torneoNombre,
      round: m.ronda,
      abiertaAlPublico: m.ronda >= (maxRonda.get(m.torneoId) ?? 0) - 1,
      playerA: nombres.get(`${m.torneoId}:${m.a}`) ?? '—',
      playerB: nombres.get(`${m.torneoId}:${m.b}`) ?? '—'
    }))
    .filter((m) => m.empezada);
}

/** GET /api/torneos/palmares: los campeones de los ultimos dias, con su podio. */
export async function palmares({ dias = 7, limite = 20, desde = 0 } = {}, ahora = Date.now()) {
  const { items, hayMas } = await Torneo.palmares({ desde: ahora - dias * 24 * 3600_000, limite, saltar: desde });
  return {
    items: items.map(({ torneo: t, podio }) => ({
      id: t.id,
      nombre: t.nombre,
      tipo: t.tipo,
      terminadoEn: iso(t.terminadoEn),
      campeon: { userId: t.campeonId, username: t.campeonNombre, esBot: t.campeonBot, avatar: podio.find((p) => p.puesto === 1)?.avatar ?? null },
      podio: podio.map((p) => ({ puesto: p.puesto, userId: p.userId, username: p.username, avatar: p.avatar, esBot: p.esBot, puntos: t.premios[p.puesto - 1] ?? 0 }))
    })),
    limite,
    desde,
    hayMas
  };
}

export async function misTitulos(yoId, { limite = 24, desde = 0 } = {}) {
  const { items, hayMas } = await Torneo.titulosDe(yoId, limite, desde);
  return { items: items.map((t) => ({ id: t.id, nombre: t.nombre, tipo: t.tipo, terminadoEn: iso(t.terminadoEn), puntos: t.premios[0] })), limite, desde, hayMas };
}

/** Los torneos vivos de alguien (inscrito, o en juego). */
export async function misTorneos(yoId) {
  const filas = await Torneo.inscripcionesDe(yoId, [Torneo.ESTADO.INSCRIPCION, Torneo.ESTADO.JUGANDO]);
  return { anotado: filas.filter((f) => f.miEstado === Torneo.INSCRIPCION.INSCRITO).map((f) => f.id), torneos: filas.map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado, miEstado: f.miEstado, empiezaEn: iso(f.empiezaEn) })) };
}
