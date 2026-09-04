import { query } from '../config/database.js';

/**
 * El registro de partidas: que se guarda y que no.
 *
 * Decision de Jonathan (4 de septiembre de 2026): **solo cuentan las partidas
 * entre personas**. Las que son contra la maquina no se guardan. El motivo es
 * que un record que incluye partidas contra bots se infla solo: cualquiera le
 * gana al bot facil toda la noche y el numero deja de servir para comparar.
 */

/** ¿Este id es de una cuenta de verdad, o de un invitado? */
export const esCuenta = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

/**
 * Guarda una partida terminada y a cada uno de los que la jugaron.
 *
 * Los invitados se saltean: no tienen cuenta, asi que no hay perfil donde
 * mostrarles nada. La partida igual se guarda, con los jugadores que si tengan
 * cuenta.
 */
export const registrar = async ({ roomCode, modo, equipoGanador, motivo, puntos, jugadores }) => {
  const { rows } = await query(
    `INSERT INTO partidas (room_code, modo, equipo_ganador, motivo, puntos_equipo1, puntos_equipo2, jugada_el)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    // La fecha va explicita y en ISO: no se depende de como quedo escrito el
    // valor por defecto de la tabla en cada base.
    [roomCode, modo, equipoGanador ?? null, motivo ?? null,
     puntos?.[1] ?? 0, puntos?.[2] ?? 0, new Date().toISOString()]
  );

  const partidaId = rows[0]?.id;
  if (!partidaId) return null;

  for (const j of jugadores) {
    if (!esCuenta(j.userId)) continue;
    await query(
      `INSERT INTO partida_jugadores (partida_id, user_id, asiento, equipo, gano)
       VALUES (?, ?, ?, ?, ?)`,
      [partidaId, Number(j.userId), j.asiento, j.equipo ?? null, j.gano ? 1 : 0]
    );
  }

  return partidaId;
};

/** Ganadas, perdidas y total de una persona. */
export const resumenDe = async (userId) => {
  const { rows } = await query(
    `SELECT COUNT(*) AS jugadas, SUM(gano) AS ganadas
     FROM partida_jugadores WHERE user_id = ?`,
    [Number(userId)]
  );

  const jugadas = Number(rows[0]?.jugadas ?? 0);
  const ganadas = Number(rows[0]?.ganadas ?? 0);

  return {
    jugadas,
    ganadas,
    perdidas: jugadas - ganadas,
    // Sin partidas no hay porcentaje. Devolver 0 mentiria: no es que pierda
    // siempre, es que todavia no jugo.
    porcentaje: jugadas > 0 ? Math.round((ganadas / jugadas) * 100) : null
  };
};

/** Las ultimas partidas de una persona, de la mas nueva a la mas vieja. */
export const historialDe = async (userId, limite = 20) => {
  const tope = Math.min(Math.max(Number(limite) || 20, 1), 50);

  const { rows } = await query(
    `SELECT p.id, p.modo, p.motivo, p.puntos_equipo1, p.puntos_equipo2, p.jugada_el,
            pj.equipo, pj.gano
     FROM partida_jugadores pj
     JOIN partidas p ON p.id = pj.partida_id
     WHERE pj.user_id = ?
     ORDER BY p.id DESC
     LIMIT ?`,
    [Number(userId), tope]
  );

  return rows.map((r) => ({
    id: r.id,
    modo: r.modo,
    motivo: r.motivo,
    gano: Boolean(Number(r.gano)),
    // Los puntos se dan vueltos hacia el que consulta: "mis puntos" y "los de
    // ellos", no "equipo 1" y "equipo 2", que no le dice nada a nadie.
    misPuntos: Number(r.equipo) === 1 ? Number(r.puntos_equipo1) : Number(r.puntos_equipo2),
    susPuntos: Number(r.equipo) === 1 ? Number(r.puntos_equipo2) : Number(r.puntos_equipo1),
    jugadaEl: r.jugada_el
  }));
};

/** Con quienes jugo esa partida, sin contarse a si mismo. */
export const rivalesDe = async (partidaIds) => {
  if (!partidaIds.length) return {};

  const huecos = partidaIds.map(() => '?').join(',');
  const { rows } = await query(
    `SELECT pj.partida_id, pj.equipo, u.username
     FROM partida_jugadores pj
     JOIN users u ON u.id = pj.user_id
     WHERE pj.partida_id IN (${huecos})`,
    partidaIds
  );

  const porPartida = {};
  for (const r of rows) {
    (porPartida[r.partida_id] ??= []).push({ username: r.username, equipo: Number(r.equipo) });
  }
  return porPartida;
};
