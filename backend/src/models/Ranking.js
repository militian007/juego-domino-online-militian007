import { query } from '../config/database.js';

/**
 * La clasificacion del club.
 *
 * Esta hecha **igual a la de PrivoyTruco** (revisada en su web el 5 de
 * septiembre de 2026, con 1208 jugadores clasificados), que es la plataforma
 * donde va a vivir el motor. Decision de Jonathan.
 *
 * Lo que eso significa, y lo que NO significa:
 *
 *  - Es una tabla de **puntos y puesto**. No hay rangos con nombre. Hubo un
 *    intento anterior con una escalera (Novato → Retador); se saco porque la
 *    plataforma no la tiene y el domino tiene que verse igual.
 *  - Cada fila muestra **victorias, jugadas y porcentaje**, no solo el puntaje.
 *  - Hay tres vistas: **General**, **Esta semana** y **Torneos**.
 *
 * Los puntos se mueven **segun quien sea el rival**: ganarle a alguien mejor da
 * mas y ganarle a uno muy por debajo da poquito. Asi la tabla mide como jugas y
 * no cuantas horas tenes libres, y nadie sube machacando siempre al mismo
 * novato. Tambien decision de Jonathan.
 *
 * Solo cuentan las partidas entre personas: contra la maquina no suma nada.
 */

/** Con cuantos puntos entra alguien nuevo. */
export const PUNTOS_INICIALES = 1000;

/** Por debajo de esto no se baja. Un numero ridiculo no motiva a nadie. */
const PISO = 100;

/**
 * Cuanto se mueve el marcador en cada partida.
 *
 * Las primeras partidas mueven mas: es la forma de que alguien nuevo llegue
 * rapido al lugar que le corresponde, en vez de pasarse meses subiendo de a
 * poquito desde el medio.
 */
const PARTIDAS_DE_UBICACION = 10;
const MOVIMIENTO_AL_PRINCIPIO = 48;
const MOVIMIENTO_NORMAL = 24;

/**
 * La semana en curso, contando de lunes a lunes.
 *
 * Se guarda como texto "2026-W36" en vez de una fecha porque asi dos partidas
 * de la misma semana caen en la misma fila sin tener que calcular rangos de
 * fechas en cada consulta.
 */
export const semanaActual = (fecha = new Date()) => {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  // Se corre al jueves de esa semana: es el truco estandar para que el numero
  // de semana no baile en los cambios de anio.
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioDeAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((d - inicioDeAnio) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(numero).padStart(2, '0')}`;
};

/**
 * Lo que se espera que saque alguien contra ese rival, entre 0 y 1.
 *
 * Es la formula de Elo, la misma del ajedrez. Cuatrocientos puntos de
 * diferencia significan que el de arriba gana diez de cada once.
 */
const esperado = (mios, delRival) => 1 / (1 + 10 ** ((delRival - mios) / 400));

/**
 * Cuanto suma o resta una partida.
 *
 * @param mios      puntos que tenia
 * @param delRival  puntos del rival (en 2v2, el promedio del equipo contrario)
 * @param gano      si gano la partida
 * @param jugadas   cuantas lleva jugadas, para saber si todavia se esta ubicando
 */
export const calcularCambio = (mios, delRival, gano, jugadas) => {
  const fuerza = jugadas < PARTIDAS_DE_UBICACION ? MOVIMIENTO_AL_PRINCIPIO : MOVIMIENTO_NORMAL;
  const cambio = Math.round(fuerza * ((gano ? 1 : 0) - esperado(mios, delRival)));

  // Ganar nunca puede restar y perder nunca puede sumar, aunque el redondeo
  // quede en cero: si no, ganarle a alguien muy por debajo no daria nada y se
  // sentiria como que el juego no registro la partida.
  if (gano && cambio < 1) return 1;
  if (!gano && cambio > -1) return -1;
  return cambio;
};

/** El porcentaje de victorias, como lo muestra PrivoyTruco. */
export const porcentaje = (ganadas, partidas) =>
  partidas > 0 ? Math.round((ganadas / partidas) * 100) : 0;

const armar = (r) => ({
  userId: Number(r.user_id),
  puntos: Number(r.puntos),
  partidas: Number(r.partidas),
  ganadas: Number(r.ganadas),
  mejorPuntos: Number(r.mejor_puntos),
  porcentaje: porcentaje(Number(r.ganadas), Number(r.partidas))
});

const fichaNueva = (userId) => ({
  userId: Number(userId),
  puntos: PUNTOS_INICIALES,
  partidas: 0,
  ganadas: 0,
  mejorPuntos: PUNTOS_INICIALES,
  porcentaje: 0
});

/**
 * La ficha de alguien.
 *
 * Si nunca jugo, se devuelve la de arranque SIN escribir nada en la base: una
 * fila por cada cuenta que solo miro la tabla no le sirve a nadie.
 */
export const de = async (userId) => {
  const { rows } = await query(
    'SELECT user_id, puntos, partidas, ganadas, mejor_puntos FROM ranking WHERE user_id = ?',
    [Number(userId)]
  );
  return rows[0] ? armar(rows[0]) : fichaNueva(userId);
};

/** Varias fichas de una vez, para no consultar una por una. */
export const deVarios = async (userIds) => {
  const ids = userIds.map(Number).filter(Number.isInteger);
  if (!ids.length) return {};

  const huecos = ids.map(() => '?').join(',');
  const { rows } = await query(
    `SELECT user_id, puntos, partidas, ganadas, mejor_puntos
     FROM ranking WHERE user_id IN (${huecos})`,
    ids
  );

  const porId = {};
  for (const id of ids) porId[id] = fichaNueva(id);
  for (const r of rows) porId[Number(r.user_id)] = armar(r);
  return porId;
};

/** Escribe los puntos nuevos de alguien. */
export const guardar = async ({ userId, puntos, partidas, ganadas, mejorPuntos }) => {
  const limpio = Math.max(PISO, Math.round(puntos));
  const mejor = Math.max(limpio, mejorPuntos);
  const cuando = new Date().toISOString();

  // Se intenta actualizar y, si no habia fila, se crea. Va en dos pasos y no
  // con un "upsert" porque esa sintaxis cambia entre SQLite y Postgres, y aca
  // corren las dos bases.
  const { rows } = await query(
    `UPDATE ranking SET puntos = ?, partidas = ?, ganadas = ?, mejor_puntos = ?, actualizado_en = ?
     WHERE user_id = ? RETURNING user_id`,
    [limpio, partidas, ganadas, mejor, cuando, Number(userId)]
  );

  if (!rows || rows.length === 0) {
    await query(
      `INSERT INTO ranking (user_id, puntos, partidas, ganadas, mejor_puntos, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(userId), limpio, partidas, ganadas, mejor, cuando]
    );
  }

  return limpio;
};

/** Suma lo de esta partida al marcador de la semana. */
const sumarALaSemana = async (userId, cambio, gano) => {
  const semana = semanaActual();

  const { rows } = await query(
    `UPDATE ranking_semana SET puntos = puntos + ?, victorias = victorias + ?
     WHERE user_id = ? AND semana = ? RETURNING id`,
    [cambio, gano ? 1 : 0, Number(userId), semana]
  );

  if (!rows || rows.length === 0) {
    await query(
      'INSERT INTO ranking_semana (user_id, semana, puntos, victorias) VALUES (?, ?, ?, ?)',
      [Number(userId), semana, cambio, gano ? 1 : 0]
    );
  }
};

/**
 * Reparte los puntos de una partida terminada.
 *
 * Cada uno se mide contra el **promedio del equipo contrario**, no contra el
 * suyo: en 2v2 lo que importa es contra quien jugaste, no con quien.
 *
 * Los invitados se saltean; no tienen cuenta ni puntos. Si de un lado no queda
 * nadie con cuenta, no se toca nada: no hay contra quien medir y repartir
 * puntos contra un fantasma seria inventar.
 *
 * @param jugadores [{ userId, equipo, gano }]
 * @returns [{ userId, antes, despues, cambio, puestoNuevo }]
 */
export const aplicarPartida = async (jugadores) => {
  const conCuenta = jugadores.filter((j) => Number.isInteger(Number(j.userId)) && Number(j.userId) > 0);
  if (conCuenta.length < 2) return [];

  const equipos = new Set(conCuenta.map((j) => j.equipo));
  if (equipos.size < 2) return [];

  const fichas = await deVarios(conCuenta.map((j) => j.userId));

  const promedioDe = (equipo) => {
    const suyos = conCuenta.filter((j) => j.equipo === equipo);
    if (!suyos.length) return null;
    return suyos.reduce((s, j) => s + fichas[Number(j.userId)].puntos, 0) / suyos.length;
  };

  // Se calculan TODOS los promedios antes de escribir nada. Si se fuera
  // guardando sobre la marcha, el segundo jugador se mediria contra los puntos
  // ya modificados del primero y la misma partida daria distinto segun el orden.
  const promedios = {};
  for (const equipo of equipos) promedios[equipo] = promedioDe(equipo);

  const cambios = [];
  for (const j of conCuenta) {
    const ficha = fichas[Number(j.userId)];
    const rival = [...equipos].find((e) => e !== j.equipo);
    const delRival = promedios[rival];
    if (delRival == null) continue;

    const cambio = calcularCambio(ficha.puntos, delRival, j.gano, ficha.partidas);
    const despues = await guardar({
      userId: j.userId,
      puntos: ficha.puntos + cambio,
      partidas: ficha.partidas + 1,
      ganadas: ficha.ganadas + (j.gano ? 1 : 0),
      mejorPuntos: ficha.mejorPuntos
    });

    await sumarALaSemana(j.userId, despues - ficha.puntos, j.gano);

    cambios.push({
      userId: Number(j.userId),
      antes: ficha.puntos,
      despues,
      cambio: despues - ficha.puntos,
      partidas: ficha.partidas + 1,
      ganadas: ficha.ganadas + (j.gano ? 1 : 0)
    });
  }

  // El puesto se calcula al final, con todos los puntos ya escritos.
  for (const c of cambios) c.puesto = await puestoDe(c.despues);

  return cambios;
};

/**
 * Suma puntos sueltos, fuera de una partida. Hoy lo usa el premio del torneo.
 *
 * Cuenta como una victoria de la semana para que el premio del torneo se vea en
 * la tabla semanal, que es donde la gente mira si esta pasando algo.
 */
export const sumarPuntos = async (userId, cuantos) => {
  const ficha = await de(userId);
  const despues = await guardar({
    userId,
    puntos: ficha.puntos + cuantos,
    partidas: ficha.partidas,
    ganadas: ficha.ganadas,
    mejorPuntos: ficha.mejorPuntos
  });
  await sumarALaSemana(userId, despues - ficha.puntos, false);
  return { antes: ficha.puntos, despues, cambio: despues - ficha.puntos };
};

/**
 * En que puesto de la tabla general va alguien con esos puntos.
 *
 * Es cuantos tienen mas puntos, mas uno.
 */
export const puestoDe = async (puntos) => {
  const { rows } = await query('SELECT COUNT(*) AS n FROM ranking WHERE puntos > ?', [Number(puntos)]);
  return Number(rows[0]?.n ?? 0) + 1;
};

/** Cuanta gente hay en la tabla. PrivoyTruco lo muestra arriba del todo. */
export const cuantosClasificados = async () => {
  const { rows } = await query('SELECT COUNT(*) AS n FROM ranking');
  return Number(rows[0]?.n ?? 0);
};

/** La tabla general: los puntos de siempre. */
export const tablaGeneral = async (cuantos = 100) => {
  const tope = Math.min(Math.max(Number(cuantos) || 100, 1), 500);

  const { rows } = await query(
    `SELECT r.user_id, r.puntos, r.partidas, r.ganadas, u.username
     FROM ranking r JOIN users u ON u.id = r.user_id
     ORDER BY r.puntos DESC, r.ganadas DESC, r.user_id ASC
     LIMIT ?`,
    [tope]
  );

  return rows.map((r, i) => ({
    puesto: i + 1,
    userId: Number(r.user_id),
    username: r.username,
    puntos: Number(r.puntos),
    partidas: Number(r.partidas),
    ganadas: Number(r.ganadas),
    porcentaje: porcentaje(Number(r.ganadas), Number(r.partidas))
  }));
};

/**
 * La tabla de la semana. Arranca de cero cada lunes.
 *
 * Es la que le da chance a alguien que entro ayer: en la general nunca va a
 * alcanzar al que lleva mil partidas, pero la semana la puede ganar cualquiera.
 */
export const tablaSemanal = async (cuantos = 100) => {
  const tope = Math.min(Math.max(Number(cuantos) || 100, 1), 500);

  const { rows } = await query(
    `SELECT s.user_id, s.puntos, s.victorias, u.username
     FROM ranking_semana s JOIN users u ON u.id = s.user_id
     WHERE s.semana = ?
     ORDER BY s.puntos DESC, s.victorias DESC, s.user_id ASC
     LIMIT ?`,
    [semanaActual(), tope]
  );

  return rows.map((r, i) => ({
    puesto: i + 1,
    userId: Number(r.user_id),
    username: r.username,
    puntos: Number(r.puntos),
    victorias: Number(r.victorias)
  }));
};

/**
 * Lo de la semana de una persona.
 *
 * Devuelve ceros si todavia no jugo esta semana, sin crear fila.
 */
export const semanaDe = async (userId) => {
  const { rows } = await query(
    'SELECT puntos, victorias FROM ranking_semana WHERE user_id = ? AND semana = ?',
    [Number(userId), semanaActual()]
  );
  return {
    puntos: Number(rows[0]?.puntos ?? 0),
    victorias: Number(rows[0]?.victorias ?? 0)
  };
};
