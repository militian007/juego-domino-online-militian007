import { query } from '../config/database.js';

/**
 * Las monedas del club (§133).
 *
 * Se ganan JUGANDO y no se compran: en Venezuela no hay pasarela de pago que
 * sirva, asi que esto es moneda de juego y nada mas. Si algun dia se vende
 * algo, sera decision aparte y con otra pasarela; nada de lo que hay aqui lo
 * da por hecho.
 *
 * ## Por que vive en el servidor
 *
 * Lo mismo que los desbloqueos: si el saldo viviera en el telefono, cualquiera
 * se regalaria mil monedas editando su navegador. El cliente nunca decide un
 * resultado ni un puntaje (CLAUDE.md regla 8); aqui tampoco un saldo.
 *
 * ## Por que hay un detalle y no solo un numero
 *
 * Un saldo suelto no se puede explicar. Cuando alguien pregunte "¿y mis 200
 * monedas?", con el detalle se contesta; con un numero pelado, no. Ademas el
 * detalle es lo que permite **no pagar dos veces por lo mismo**: cada
 * movimiento lleva su `referencia` y hay un indice unico sobre
 * (user_id, motivo, referencia).
 */

/** Lo que paga cada cosa. Los numeros salen de la medicion de abajo. */
export const TARIFAS = {
  /** Por jugar una partida entre personas, ganes o pierdas. */
  partida: 5,
  /** Extra por ganarla. */
  victoria: 15,
  /** La primera victoria del dia, una sola vez. */
  primeraDelDia: 25
};

/**
 * Contra la maquina NO se pagan monedas.
 *
 * Es la misma regla que la clasificacion: contra un bot no suma. Si pagara,
 * la forma mas rapida de hacerse rico seria jugar solo contra la casa, que es
 * justo lo contrario de lo que se quiere.
 */
export const PAGA_CONTRA_BOTS = false;

const hoy = () => new Date().toISOString().slice(0, 10);

/** El saldo y los totales de alguien. Si nunca gano nada, todo en cero. */
export const de = async (userId) => {
  const { rows } = await query(
    'SELECT saldo, ganadas_total, gastadas_total FROM monedas WHERE user_id = ?',
    [Number(userId)]
  );
  const r = rows[0];
  return {
    saldo: r?.saldo ?? 0,
    ganadasTotal: r?.ganadas_total ?? 0,
    gastadasTotal: r?.gastadas_total ?? 0
  };
};

/** Los saldos de varios de una sola vez, para no pedir uno por uno. */
export const deVarios = async (userIds) => {
  const ids = userIds.map(Number).filter(Number.isFinite);
  if (ids.length === 0) return {};
  const huecos = ids.map(() => '?').join(', ');
  const { rows } = await query(
    `SELECT user_id, saldo FROM monedas WHERE user_id IN (${huecos})`,
    ids
  );
  const out = {};
  for (const r of rows) out[r.user_id] = r.saldo;
  for (const id of ids) if (out[id] == null) out[id] = 0;
  return out;
};

async function asegurarFila(userId) {
  const { rows } = await query('SELECT user_id FROM monedas WHERE user_id = ?', [Number(userId)]);
  if (rows.length > 0) return;
  await query(
    'INSERT INTO monedas (user_id, saldo, ganadas_total, gastadas_total, actualizado_en) VALUES (?, 0, 0, 0, ?)',
    [Number(userId), new Date().toISOString()]
  );
}

/**
 * Anota el movimiento. Si ya estaba anotado con esa misma referencia, no hace
 * nada y avisa.
 *
 * @returns `true` si se anoto de verdad, `false` si ya estaba
 */
async function anotar(userId, cuanto, motivo, referencia) {
  const { rows } = await query(
    'SELECT id FROM monedas_movimientos WHERE user_id = ? AND motivo = ? AND referencia = ?',
    [Number(userId), motivo, referencia ?? '']
  );
  if (rows.length > 0) return false;

  await query(
    'INSERT INTO monedas_movimientos (user_id, cuanto, motivo, referencia, creado_en) VALUES (?, ?, ?, ?, ?)',
    [Number(userId), cuanto, motivo, referencia ?? '', new Date().toISOString()]
  );
  return true;
}

/**
 * Le da monedas a alguien.
 *
 * La `referencia` es lo que evita pagar dos veces por el mismo hecho: si el
 * servidor reintenta, o si dos caminos distintos avisan de la misma partida,
 * la segunda vez no suma. Sin esto, un reintento regala monedas.
 *
 * @returns cuanto se sumo de verdad (0 si ya estaba pagado)
 */
export const dar = async (userId, cuanto, motivo, referencia = null) => {
  const monto = Math.round(Number(cuanto) || 0);
  if (monto <= 0) return 0;

  await asegurarFila(userId);
  if (!(await anotar(userId, monto, motivo, referencia))) return 0;

  await query(
    'UPDATE monedas SET saldo = saldo + ?, ganadas_total = ganadas_total + ?, actualizado_en = ? WHERE user_id = ?',
    [monto, monto, new Date().toISOString(), Number(userId)]
  );
  return monto;
};

/**
 * Le quita monedas a alguien, si le alcanza.
 *
 * **Nunca deja el saldo en negativo.** Si no le alcanza, no cobra nada y avisa:
 * cobrar de mas y dejar el saldo bajo cero es la clase de error que despues no
 * se sabe deshacer.
 *
 * @returns `{ ok, saldo, error }`
 */
export const cobrar = async (userId, cuanto, motivo, referencia = null) => {
  const monto = Math.round(Number(cuanto) || 0);
  if (monto <= 0) return { ok: false, error: 'Monto inválido' };

  await asegurarFila(userId);
  const { saldo } = await de(userId);
  if (saldo < monto) {
    return { ok: false, saldo, error: 'No te alcanzan las monedas' };
  }

  if (!(await anotar(userId, -monto, motivo, referencia))) {
    return { ok: false, saldo, error: 'Eso ya estaba pagado' };
  }

  await query(
    'UPDATE monedas SET saldo = saldo - ?, gastadas_total = gastadas_total + ?, actualizado_en = ? WHERE user_id = ?',
    [monto, monto, new Date().toISOString(), Number(userId)]
  );
  return { ok: true, saldo: saldo - monto };
};

/** Los ultimos movimientos, para poder explicar el saldo. */
export const movimientos = async (userId, cuantos = 20) => {
  const { rows } = await query(
    'SELECT cuanto, motivo, referencia, creado_en FROM monedas_movimientos WHERE user_id = ? ORDER BY id DESC LIMIT ?',
    [Number(userId), Number(cuantos)]
  );
  return rows.map((r) => ({
    cuanto: r.cuanto,
    motivo: r.motivo,
    referencia: r.referencia || null,
    creadoEn: r.creado_en
  }));
};

/**
 * Lo que se paga al terminar una partida ENTRE PERSONAS.
 *
 * Se llama una vez por jugador. La referencia lleva el codigo de la partida,
 * asi que si el servidor avisa dos veces de la misma, la segunda no paga.
 *
 * @param jugadores `[{ userId, gano }]`, sin bots
 * @param referencia el codigo de la partida
 */
export const alTerminarPartida = async (jugadores, referencia) => {
  const pagos = [];

  for (const j of jugadores) {
    if (!j?.userId) continue;

    let total = 0;
    total += await dar(j.userId, TARIFAS.partida, 'partida', referencia);
    if (j.gano) {
      total += await dar(j.userId, TARIFAS.victoria, 'victoria', referencia);
      // La primera victoria del dia, una sola vez: la referencia es el dia.
      total += await dar(j.userId, TARIFAS.primeraDelDia, 'primera-del-dia', hoy());
    }

    if (total > 0) pagos.push({ userId: j.userId, cuanto: total });
  }

  return pagos;
};
