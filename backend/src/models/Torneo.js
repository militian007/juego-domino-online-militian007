import { query } from '../config/database.js';

/**
 * LOS TORNEOS EN LA BASE (seccion 211). Solo habla con la base; quien arma el
 * cuadro, lanza las mesas y lo hace avanzar es `services/torneos.js`.
 *
 * Es la copia del truco (tournament, tournament_registration,
 * tournament_match, tournament_series_game) SIN PLATA: el premio son puntos de
 * clasificacion y una copa. Los nombres de los estados son los del truco, para
 * que la pantalla se pueda copiar tal cual.
 *
 * Todo el cuadro vive aqui y no en memoria: si el servidor se reinicia a
 * mitad de torneo, el reconciliador lo retoma desde estas filas.
 */

export const ESTADO = {
  INSCRIPCION: 'registration',
  JUGANDO: 'live',
  TERMINADO: 'completed',
  CANCELADO: 'cancelled'
};

export const INSCRIPCION = {
  INSCRITO: 'registered',
  AUSENTE: 'ausente',
  SIN_CUPO: 'sin_cupo'
};

export const CRUCE = {
  PENDIENTE: 'pending',
  LISTO: 'ready',
  JUGANDO: 'playing',
  TERMINADO: 'completed',
  BYE: 'bye'
};

const num = (v) => (v == null ? null : Number(v));

const armarTorneo = (r) => ({
  id: Number(r.id),
  nombre: r.nombre,
  tipo: r.tipo,
  estado: r.estado,
  empiezaEn: num(r.empieza_en),
  puntos: Number(r.puntos),
  cupo: Number(r.cupo),
  minimo: Number(r.minimo),
  relleno: Number(r.relleno) === 1,
  cuadroMinimo: Number(r.cuadro_minimo),
  botNivel: r.bot_nivel || 'persona',
  premios: [Number(r.premio1), Number(r.premio2), Number(r.premio3)],
  creadoPor: r.creado_por,
  creadoEn: num(r.creado_en),
  actualizadoEn: num(r.actualizado_en),
  terminadoEn: num(r.terminado_en),
  segundaHasta: num(r.segunda_hasta),
  ventanaAvisada: Number(r.ventana_avisada) === 1,
  recordatorioMin: num(r.recordatorio_min),
  premiado: Number(r.premiado) === 1,
  campeonId: r.campeon_id ?? null,
  campeonNombre: r.campeon_nombre ?? null,
  campeonBot: Number(r.campeon_bot) === 1
});

const armarInscrito = (r) => ({
  id: Number(r.id),
  torneoId: Number(r.torneo_id),
  userId: r.user_id,
  username: r.username,
  avatar: r.avatar ?? null,
  esBot: Number(r.es_bot) === 1,
  estado: r.estado,
  siembra: num(r.siembra),
  puesto: num(r.puesto),
  inscritoEn: num(r.inscrito_en)
});

const armarCruce = (r) => ({
  id: Number(r.id),
  torneoId: Number(r.torneo_id),
  ronda: Number(r.ronda),
  slot: Number(r.slot),
  a: r.jugador_a ?? null,
  b: r.jugador_b ?? null,
  ganador: r.ganador ?? null,
  estado: r.estado,
  siguienteId: num(r.siguiente_id),
  siguienteLado: r.siguiente_lado ?? null,
  plazoEn: num(r.plazo_en),
  presenteA: num(r.presente_a),
  presenteB: num(r.presente_b),
  prorrogaEn: num(r.prorroga_en),
  segundaLlamada: Number(r.segunda_llamada) === 1,
  motivo: r.motivo ?? null,
  marcadorA: num(r.marcador_a),
  marcadorB: num(r.marcador_b),
  terminadoEn: num(r.terminado_en)
});

const armarMesa = (r) => ({
  id: Number(r.id),
  cruceId: Number(r.cruce_id),
  numero: Number(r.numero),
  code: r.code,
  estado: r.estado,
  ganador: r.ganador ?? null,
  marcadorA: num(r.marcador_a),
  marcadorB: num(r.marcador_b),
  creadaEn: num(r.creada_en),
  terminadaEn: num(r.terminada_en)
});

/**
 * UPDATE con los campos de un objeto (camelCase → columna). Devuelve true si
 * toco una fila: se pregunta con RETURNING porque SQLite y Postgres no
 * cuentan las filas de la misma manera, y el «¿lo hice yo?» es lo que hace
 * idempotente cada paso del cuadro.
 */
const COLUMNAS = {
  nombre: 'nombre', estado: 'estado', empiezaEn: 'empieza_en', actualizadoEn: 'actualizado_en', terminadoEn: 'terminado_en',
  segundaHasta: 'segunda_hasta', ventanaAvisada: 'ventana_avisada', recordatorioMin: 'recordatorio_min', premiado: 'premiado',
  campeonId: 'campeon_id', campeonNombre: 'campeon_nombre', campeonBot: 'campeon_bot',
  a: 'jugador_a', b: 'jugador_b', ganador: 'ganador', siguienteId: 'siguiente_id', siguienteLado: 'siguiente_lado',
  plazoEn: 'plazo_en', presenteA: 'presente_a', presenteB: 'presente_b', prorrogaEn: 'prorroga_en', segundaLlamada: 'segunda_llamada',
  motivo: 'motivo', marcadorA: 'marcador_a', marcadorB: 'marcador_b', code: 'code', terminadaEn: 'terminada_en',
  siembra: 'siembra', puesto: 'puesto', username: 'username', avatar: 'avatar'
};

async function actualizar(tabla, id, campos, condicion = '', extra = []) {
  const claves = Object.keys(campos).filter((k) => COLUMNAS[k]);
  if (!claves.length) return false;
  const sets = claves.map((k) => `${COLUMNAS[k]} = ?`).join(', ');
  const valores = claves.map((k) => (typeof campos[k] === 'boolean' ? (campos[k] ? 1 : 0) : campos[k]));
  const { rows } = await query(
    `UPDATE ${tabla} SET ${sets} WHERE id = ? ${condicion} RETURNING id`,
    [...valores, Number(id), ...extra]
  );
  return rows.length > 0;
}

// ------------------------------------------------------------ torneos

export const crear = async ({ nombre, tipo, empiezaEn, puntos, cupo, minimo = 2, relleno = true, cuadroMinimo = 16, botNivel = 'persona', premios = [0, 0, 0], creadoPor = null }) => {
  const ahora = Date.now();
  const { rows } = await query(
    `INSERT INTO copa_torneos (nombre, tipo, estado, empieza_en, puntos, cupo, minimo, relleno, cuadro_minimo, bot_nivel,
       premio1, premio2, premio3, creado_por, creado_en, actualizado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [nombre, tipo, ESTADO.INSCRIPCION, Number(empiezaEn), Number(puntos), Number(cupo), Number(minimo), relleno ? 1 : 0,
      Number(cuadroMinimo), botNivel, Number(premios[0] ?? 0), Number(premios[1] ?? 0), Number(premios[2] ?? 0), creadoPor, ahora, ahora]
  );
  return Number(rows[0]?.id);
};

export const porId = async (id) => {
  const { rows } = await query('SELECT * FROM copa_torneos WHERE id = ?', [Number(id)]);
  return rows[0] ? armarTorneo(rows[0]) : null;
};

export const actualizarTorneo = (id, campos, condicion, extra) =>
  actualizar('copa_torneos', id, { ...campos, actualizadoEn: Date.now() }, condicion, extra);

/** Pasa de un estado a otro solo si sigue en el de antes (idempotente). */
export const cambiarEstado = (id, de, a, extra = {}) =>
  actualizarTorneo(id, { estado: a, ...extra }, 'AND estado = ?', [de]);

export const conEstado = async (estados) => {
  const huecos = estados.map(() => '?').join(',');
  const { rows } = await query(`SELECT * FROM copa_torneos WHERE estado IN (${huecos}) ORDER BY empieza_en ASC`, estados);
  return rows.map(armarTorneo);
};

/** Los que ya deberian arrancar. */
export const vencidos = async (ahora) => {
  const { rows } = await query('SELECT * FROM copa_torneos WHERE estado = ? AND empieza_en <= ? ORDER BY empieza_en ASC', [ESTADO.INSCRIPCION, Number(ahora)]);
  return rows.map(armarTorneo);
};

/** Para la vitrina: los que no han empezado, los que van, y los terminados recientes. */
export const vitrina = async (desdeTerminados) => {
  const { rows } = await query(
    `SELECT * FROM copa_torneos
     WHERE estado IN (?, ?) OR (estado = ? AND terminado_en >= ?)
     ORDER BY empieza_en ASC`,
    [ESTADO.INSCRIPCION, ESTADO.JUGANDO, ESTADO.TERMINADO, Number(desdeTerminados)]
  );
  return rows.map(armarTorneo);
};

/** Todos, para el cuarto del socio (los mas nuevos primero). */
export const ultimos = async (cuantos = 100) => {
  const { rows } = await query('SELECT * FROM copa_torneos ORDER BY empieza_en DESC LIMIT ?', [Math.min(Math.max(Number(cuantos) || 100, 1), 500)]);
  return rows.map(armarTorneo);
};

/** Los del Relampago entre dos instantes (la serie de la noche). */
export const relampagosEntre = async (desde, hasta) => {
  const { rows } = await query(
    'SELECT * FROM copa_torneos WHERE tipo = ? AND empieza_en >= ? AND empieza_en < ? AND estado <> ? ORDER BY empieza_en ASC',
    ['relampago', Number(desde), Number(hasta), ESTADO.CANCELADO]
  );
  return rows.map(armarTorneo);
};

/** ¿Ya hay un Relampago con ese nombre desde ese instante? (la grilla pregunta por el NOMBRE) */
export const hayRelampago = async (nombre, desde) => {
  const { rows } = await query('SELECT id FROM copa_torneos WHERE tipo = ? AND nombre = ? AND empieza_en >= ?', ['relampago', nombre, Number(desde)]);
  return rows.length > 0;
};

/** El proximo Relampago abierto, para decirle al que llego tarde a donde ir. */
export const proximoRelampago = async (ahora) => {
  const { rows } = await query(
    'SELECT * FROM copa_torneos WHERE tipo = ? AND estado = ? AND empieza_en > ? ORDER BY empieza_en ASC LIMIT 1',
    ['relampago', ESTADO.INSCRIPCION, Number(ahora)]
  );
  return rows[0] ? armarTorneo(rows[0]) : null;
};

/** Marca «ya se repartieron los premios». Solo UNA vez: el que gana la carrera paga. */
export const marcarPremiado = (id) => actualizarTorneo(id, { premiado: 1 }, 'AND premiado = 0');

// ------------------------------------------------------------ inscritos

/** Anota. Devuelve false si ya estaba (el indice unico manda). */
export const inscribir = async (torneoId, { userId, username, avatar = null, esBot = false, estado = INSCRIPCION.INSCRITO, inscritoEn = Date.now() }) => {
  const { rows } = await query(
    `INSERT INTO copa_inscritos (torneo_id, user_id, username, avatar, es_bot, estado, inscrito_en)
     VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (torneo_id, user_id) DO NOTHING RETURNING id`,
    [Number(torneoId), String(userId), String(username).slice(0, 255), avatar, esBot ? 1 : 0, estado, Number(inscritoEn)]
  );
  return rows.length > 0;
};

export const quitar = async (torneoId, userId) => {
  await query('DELETE FROM copa_inscritos WHERE torneo_id = ? AND user_id = ?', [Number(torneoId), String(userId)]);
};

export const inscripcion = async (torneoId, userId) => {
  const { rows } = await query('SELECT * FROM copa_inscritos WHERE torneo_id = ? AND user_id = ?', [Number(torneoId), String(userId)]);
  return rows[0] ? armarInscrito(rows[0]) : null;
};

export const inscritos = async (torneoId) => {
  const { rows } = await query('SELECT * FROM copa_inscritos WHERE torneo_id = ? ORDER BY inscrito_en ASC, id ASC', [Number(torneoId)]);
  return rows.map(armarInscrito);
};

/** Cuantos hay por torneo y estado, de varios torneos de una vez. */
export const conteos = async (torneoIds) => {
  const out = new Map();
  if (!torneoIds.length) return out;
  const huecos = torneoIds.map(() => '?').join(',');
  const { rows } = await query(
    `SELECT torneo_id, estado, es_bot, COUNT(*) AS n FROM copa_inscritos WHERE torneo_id IN (${huecos}) GROUP BY torneo_id, estado, es_bot`,
    torneoIds.map(Number)
  );
  for (const r of rows) {
    const id = Number(r.torneo_id);
    const c = out.get(id) ?? { inscritos: 0, humanos: 0, anotados: 0 };
    const n = Number(r.n);
    if (r.estado === INSCRIPCION.INSCRITO) c.inscritos += n;
    if (Number(r.es_bot) !== 1) {
      c.anotados += n;
      if (r.estado === INSCRIPCION.INSCRITO) c.humanos += n;
    }
    out.set(id, c);
  }
  return out;
};

export const actualizarInscrito = (id, campos) => actualizar('copa_inscritos', id, campos);

/** Las inscripciones vivas de alguien (para uno-a-la-vez y «mis torneos»). */
export const inscripcionesDe = async (userId, estadosTorneo) => {
  const huecos = estadosTorneo.map(() => '?').join(',');
  const { rows } = await query(
    `SELECT t.*, i.estado AS mi_estado FROM copa_inscritos i JOIN copa_torneos t ON t.id = i.torneo_id
     WHERE i.user_id = ? AND t.estado IN (${huecos}) ORDER BY t.empieza_en ASC`,
    [String(userId), ...estadosTorneo]
  );
  return rows.map((r) => ({ ...armarTorneo(r), miEstado: r.mi_estado }));
};

// ------------------------------------------------------------ cruces

export const crearCruce = async ({ torneoId, ronda, slot, a = null, b = null, ganador = null, estado, siguienteId = null, siguienteLado = null }) => {
  const { rows } = await query(
    `INSERT INTO copa_cruces (torneo_id, ronda, slot, jugador_a, jugador_b, ganador, estado, siguiente_id, siguiente_lado, terminado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [Number(torneoId), ronda, slot, a, b, ganador, estado, siguienteId, siguienteLado, estado === CRUCE.BYE ? Date.now() : null]
  );
  return Number(rows[0]?.id);
};

/** Tira el cuadro de un torneo que todavia no arranco (un arranque que se cayo a la mitad). */
export const borrarCuadro = async (torneoId) => {
  await query('DELETE FROM copa_cruces WHERE torneo_id = ?', [Number(torneoId)]);
};

export const cruces = async (torneoId) => {
  const { rows } = await query('SELECT * FROM copa_cruces WHERE torneo_id = ? ORDER BY ronda ASC, slot ASC', [Number(torneoId)]);
  return rows.map(armarCruce);
};

export const cruce = async (id) => {
  const { rows } = await query('SELECT * FROM copa_cruces WHERE id = ?', [Number(id)]);
  return rows[0] ? armarCruce(rows[0]) : null;
};

export const actualizarCruce = (id, campos, condicion, extra) => actualizar('copa_cruces', id, campos, condicion, extra);

/** Cruces con el plazo vencido en torneos en juego (el barrido de presentacion). */
export const crucesVencidos = async (ahora) => {
  const { rows } = await query(
    `SELECT c.* FROM copa_cruces c JOIN copa_torneos t ON t.id = c.torneo_id
     WHERE t.estado = ? AND c.estado IN (?, ?) AND c.ganador IS NULL AND c.plazo_en IS NOT NULL AND c.plazo_en <= ?`,
    [ESTADO.JUGANDO, CRUCE.LISTO, CRUCE.JUGANDO, Number(ahora)]
  );
  return rows.map(armarCruce);
};

// ------------------------------------------------------------ mesas

export const crearMesa = async ({ cruceId, numero, code }) => {
  const { rows } = await query(
    `INSERT INTO copa_mesas (cruce_id, numero, code, estado, creada_en) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (cruce_id, numero) DO NOTHING RETURNING id`,
    [Number(cruceId), Number(numero), code, 'playing', Date.now()]
  );
  return rows[0] ? Number(rows[0].id) : null;
};

export const mesasDeCruce = async (cruceId) => {
  const { rows } = await query('SELECT * FROM copa_mesas WHERE cruce_id = ? ORDER BY numero ASC', [Number(cruceId)]);
  return rows.map(armarMesa);
};

/** Las mesas de un torneo, con el cruce al lado. */
export const mesasDelTorneo = async (torneoId) => {
  const { rows } = await query(
    `SELECT m.* FROM copa_mesas m JOIN copa_cruces c ON c.id = m.cruce_id WHERE c.torneo_id = ? ORDER BY m.id ASC`,
    [Number(torneoId)]
  );
  return rows.map(armarMesa);
};

export const mesaPorCode = async (code) => {
  const { rows } = await query('SELECT * FROM copa_mesas WHERE code = ? ORDER BY id DESC LIMIT 1', [String(code)]);
  return rows[0] ? armarMesa(rows[0]) : null;
};

/** Todas las mesas en juego de todos los torneos en juego (para «en vivo» y el reconciliador). */
export const mesasEnJuego = async () => {
  const { rows } = await query(
    `SELECT m.*, c.torneo_id AS c_torneo, c.ronda AS c_ronda, c.jugador_a AS c_a, c.jugador_b AS c_b, t.nombre AS t_nombre
     FROM copa_mesas m JOIN copa_cruces c ON c.id = m.cruce_id JOIN copa_torneos t ON t.id = c.torneo_id
     WHERE m.estado = ? AND t.estado = ?`,
    ['playing', ESTADO.JUGANDO]
  );
  return rows.map((r) => ({ ...armarMesa(r), torneoId: Number(r.c_torneo), ronda: Number(r.c_ronda), a: r.c_a, b: r.c_b, torneoNombre: r.t_nombre }));
};

export const actualizarMesa = (id, campos, condicion, extra) => actualizar('copa_mesas', id, campos, condicion, extra);

export const borrarMesa = async (id) => {
  await query('DELETE FROM copa_mesas WHERE id = ?', [Number(id)]);
};

// ------------------------------------------------------------ el palmares

/** Los torneos terminados de los ultimos dias, con su podio (el PALMARES del truco). */
export const palmares = async ({ desde, limite = 20, saltar = 0 }) => {
  const { rows } = await query(
    `SELECT * FROM copa_torneos WHERE estado = ? AND campeon_id IS NOT NULL AND terminado_en >= ?
     ORDER BY terminado_en DESC LIMIT ? OFFSET ?`,
    [ESTADO.TERMINADO, Number(desde), Number(limite) + 1, Number(saltar)]
  );
  const torneos = rows.map(armarTorneo);
  const podios = await podiosDe(torneos.slice(0, limite).map((t) => t.id));
  return {
    items: torneos.slice(0, limite).map((t) => ({ torneo: t, podio: podios.get(t.id) ?? [] })),
    hayMas: torneos.length > limite
  };
};

/** Los tres primeros de cada torneo. */
export const podiosDe = async (torneoIds) => {
  const out = new Map();
  if (!torneoIds.length) return out;
  const huecos = torneoIds.map(() => '?').join(',');
  const { rows } = await query(
    `SELECT * FROM copa_inscritos WHERE torneo_id IN (${huecos}) AND puesto IS NOT NULL AND puesto <= 3 ORDER BY puesto ASC`,
    torneoIds.map(Number)
  );
  for (const r of rows.map(armarInscrito)) {
    const l = out.get(r.torneoId) ?? [];
    l.push(r);
    out.set(r.torneoId, l);
  }
  return out;
};

/** Los torneos que gano alguien (sin ventana de dias: es su carrera). */
export const titulosDe = async (userId, limite = 24, saltar = 0) => {
  const { rows } = await query(
    'SELECT * FROM copa_torneos WHERE estado = ? AND campeon_id = ? ORDER BY terminado_en DESC LIMIT ? OFFSET ?',
    [ESTADO.TERMINADO, String(userId), Number(limite) + 1, Number(saltar)]
  );
  return { items: rows.slice(0, limite).map(armarTorneo), hayMas: rows.length > limite };
};

/**
 * Cuantas copas tiene cada uno: la vista «Torneos» de la clasificacion.
 *
 * Suma las del motor nuevo y las del programador viejo (la tabla `torneos`,
 * que puede tener campeones en produccion). Los bots no entran a la tabla.
 */
export const tablaDeCopas = async (cuantos = 100) => {
  const tope = Math.min(Math.max(Number(cuantos) || 100, 1), 500);
  const porId = new Map();
  const { rows: nuevos } = await query(
    `SELECT campeon_id, MAX(campeon_nombre) AS username, COUNT(*) AS copas FROM copa_torneos
     WHERE estado = ? AND campeon_id IS NOT NULL AND campeon_bot = 0 GROUP BY campeon_id`,
    [ESTADO.TERMINADO]
  );
  for (const r of nuevos) porId.set(String(r.campeon_id), { userId: r.campeon_id, username: r.username, copas: Number(r.copas) });
  try {
    const { rows: viejos } = await query(
      `SELECT t.campeon_id, u.username, COUNT(*) AS copas FROM torneos t JOIN users u ON u.id = t.campeon_id
       WHERE t.estado = ? AND t.campeon_id IS NOT NULL GROUP BY t.campeon_id, u.username`,
      ['terminado']
    );
    for (const r of viejos) {
      const k = String(r.campeon_id);
      const f = porId.get(k) ?? { userId: r.campeon_id, username: r.username, copas: 0 };
      f.copas += Number(r.copas);
      porId.set(k, f);
    }
  } catch {
    // Sin la tabla vieja (base nueva): solo cuentan las nuevas.
  }
  const filas = [...porId.values()];
  const cuentas = filas.map((f) => Number(f.userId)).filter((n) => Number.isInteger(n) && n > 0);
  const fichas = new Map();
  if (cuentas.length) {
    const huecos = cuentas.map(() => '?').join(',');
    const { rows } = await query(`SELECT user_id, ganadas, partidas FROM ranking WHERE user_id IN (${huecos})`, cuentas);
    for (const r of rows) fichas.set(String(r.user_id), r);
  }
  return filas
    .map((f) => {
      const ficha = fichas.get(String(f.userId));
      const esCuenta = /^\d+$/.test(String(f.userId));
      return { userId: esCuenta ? Number(f.userId) : f.userId, username: f.username, copas: f.copas, ganadas: Number(ficha?.ganadas ?? 0), partidas: Number(ficha?.partidas ?? 0) };
    })
    .sort((x, y) => y.copas - x.copas || y.ganadas - x.ganadas)
    .slice(0, tope)
    .map((f, i) => ({ puesto: i + 1, ...f }));
};

/** Cuantas copas tiene una persona, para su perfil. */
export const copasDe = async (userId) => {
  const { rows } = await query('SELECT COUNT(*) AS n FROM copa_torneos WHERE campeon_id = ? AND estado = ?', [String(userId), ESTADO.TERMINADO]);
  let n = Number(rows[0]?.n ?? 0);
  if (/^\d+$/.test(String(userId))) {
    try {
      const { rows: v } = await query('SELECT COUNT(*) AS n FROM torneos WHERE campeon_id = ? AND estado = ?', [Number(userId), 'terminado']);
      n += Number(v[0]?.n ?? 0);
    } catch { /* sin tabla vieja */ }
  }
  return n;
};
