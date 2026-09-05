import { query } from '../config/database.js';

/**
 * El ranking del club.
 *
 * Decisiones de Jonathan (5 de septiembre de 2026):
 *
 *  - Los puntos se mueven **segun quien sea el rival**. Ganarle a alguien mejor
 *    da mas; ganarle a uno muy por debajo da poquito. Asi el ranking mide como
 *    jugas y no cuantas horas tenes libres, y nadie sube machacando siempre al
 *    mismo novato.
 *  - **Un solo ranking, sin temporadas.** No se reinicia nunca.
 *  - El rango mas alto es **Retador**, y ahi adentro cada uno tiene su puesto:
 *    Top 100, Top 500, y de ahi en adelante el numero que le toque.
 *
 * Solo cuentan las partidas entre personas, igual que el historial: contra la
 * maquina no suma nada.
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
 * La escalera, de abajo hacia arriba. Cada rango empieza en sus puntos.
 *
 * Retador no tiene techo: es el ultimo.
 */
export const RANGOS = [
  { nombre: 'Novato', desde: 0 },
  { nombre: 'Aficionado', desde: 1000 },
  { nombre: 'Jugador de Club', desde: 1150 },
  { nombre: 'Veterano', desde: 1300 },
  { nombre: 'Maestro', desde: 1450 },
  { nombre: 'Gran Maestro', desde: 1600 },
  { nombre: 'Retador', desde: 1750 }
];

export const PUNTOS_DE_RETADOR = RANGOS[RANGOS.length - 1].desde;

/** Que rango le toca a esos puntos. */
export const rangoDe = (puntos) => {
  let actual = RANGOS[0];
  for (const r of RANGOS) if (puntos >= r.desde) actual = r;
  return actual.nombre;
};

/**
 * Cuanto falta para el rango siguiente, o null si ya es Retador.
 *
 * Se devuelven tambien los DOS umbrales, el del rango actual y el del siguiente.
 * Sin ellos la pantalla no puede dibujar la barra de avance: necesita saber
 * donde empieza el tramo, no solo cuanto falta para el final.
 */
export const faltaParaElSiguiente = (puntos) => {
  const siguiente = RANGOS.find((r) => puntos < r.desde);
  if (!siguiente) return null;

  let desdeActual = RANGOS[0].desde;
  for (const r of RANGOS) if (puntos >= r.desde) desdeActual = r.desde;

  return {
    rango: siguiente.nombre,
    desde: siguiente.desde,
    desdeActual,
    faltan: siguiente.desde - puntos
  };
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

const armar = (r) => ({
  userId: Number(r.user_id),
  puntos: Number(r.puntos),
  partidas: Number(r.partidas),
  ganadas: Number(r.ganadas),
  mejorPuntos: Number(r.mejor_puntos),
  rango: rangoDe(Number(r.puntos))
});

const fichaNueva = (userId) => ({
  userId: Number(userId),
  puntos: PUNTOS_INICIALES,
  partidas: 0,
  ganadas: 0,
  mejorPuntos: PUNTOS_INICIALES,
  rango: rangoDe(PUNTOS_INICIALES)
});

/**
 * La ficha de alguien.
 *
 * Si nunca jugo, se devuelve la de arranque SIN escribir nada en la base: una
 * fila por cada cuenta que solo miro el perfil no le sirve a nadie.
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
 * @returns [{ userId, antes, despues, cambio, rango }]
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

    cambios.push({
      userId: Number(j.userId),
      antes: ficha.puntos,
      despues,
      cambio: despues - ficha.puntos,
      rango: rangoDe(despues),
      subioDeRango: rangoDe(despues) !== rangoDe(ficha.puntos) && despues > ficha.puntos
    });
  }

  return cambios;
};

/**
 * En que puesto va alguien entre TODOS los Retadores.
 *
 * Devuelve null si todavia no llego: abajo de Retador el puesto no significa
 * nada y mostrarlo solo confunde.
 */
export const puestoDeRetador = async (userId, puntos) => {
  if (puntos < PUNTOS_DE_RETADOR) return null;

  const { rows } = await query(
    'SELECT COUNT(*) AS n FROM ranking WHERE puntos >= ? AND puntos > ?',
    [PUNTOS_DE_RETADOR, Number(puntos)]
  );
  return Number(rows[0]?.n ?? 0) + 1;
};

/** Cuantos llegaron a Retador. */
export const cuantosRetadores = async () => {
  const { rows } = await query(
    'SELECT COUNT(*) AS n FROM ranking WHERE puntos >= ?',
    [PUNTOS_DE_RETADOR]
  );
  return Number(rows[0]?.n ?? 0);
};

/**
 * La distincion que se muestra al lado del nombre de un Retador.
 *
 * Pedido de Jonathan: dentro de Retador hay un Top 100, un Top 500, y de ahi en
 * adelante el numero que le toque a cada uno.
 */
export const distincionDeRetador = (puesto) => {
  if (puesto == null) return null;
  if (puesto <= 100) return 'Top 100';
  if (puesto <= 500) return 'Top 500';
  return `#${puesto}`;
};

/** La tabla de posiciones. */
export const tabla = async (cuantos = 100) => {
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
    rango: rangoDe(Number(r.puntos))
  }));
};
