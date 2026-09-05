import * as Pase from '../models/Pase.js';
import * as Mision from '../models/Mision.js';
import * as Invitacion from '../models/Invitacion.js';
import * as Notificacion from '../models/Notificacion.js';

/**
 * El enganche del pase de batalla con el resto del juego.
 *
 * Los modelos saben de experiencia y de misiones, pero no saben cuando pasan
 * las cosas. Este archivo es el que escucha: termino una partida, se gano un
 * torneo, llego un pana. Todo lo dispara el SERVIDOR cuando el hecho ya
 * ocurrio; el cliente nunca puede pedir experiencia.
 */

const salaDe = (userId) => `user:${userId}`;

let io = null;

export const conectar = (servidor) => {
  io = servidor;
};

// --------------------------------------------------------- cuanto da cada cosa

/** Ganar y perder contra personas. Perder tambien suma: el que pierde tambien jugo. */
export const XP_VICTORIA = 25;
export const XP_DERROTA = 10;

/**
 * Contra la maquina se gana mucho menos, y con tope diario.
 *
 * Sin tope, alguien deja el telefono ganandole al bot toda la noche y termina
 * la temporada en una tarde. Con el tope, el bot sirve para entrenar y para
 * avanzar un poquito, no para vivir de el.
 */
export const XP_VICTORIA_BOT = 6;
export const XP_DERROTA_BOT = 3;
export const TOPE_BOTS_DIA = 30;

/** Lo que da cada pana que trae a alguien, aparte de la mision de los tres. */
export const XP_POR_PANA = 150;

const CLAVE_TOPE_BOTS = 'tope:bots';

// ------------------------------------------------------------------ avisar

/**
 * Le cuenta a alguien que subio de nivel.
 *
 * Va por notificacion Y por socket: la notificacion queda en la campana para
 * cuando vuelva, y el socket se lo muestra en el momento si esta conectado.
 */
const avisarDeNiveles = async (userId, resultado) => {
  if (!resultado?.subio) return;

  const premios = resultado.premios.filter((p) => p.tipo === 'desbloqueo');
  const cuerpo = premios.length
    ? `Ganaste: ${premios.map((p) => p.nombre).join(', ')}.`
    : 'Seguí jugando que el próximo premio está cerca.';

  try {
    const guardado = await Notificacion.crear({
      userId,
      tipo: Notificacion.TIPO.PASE,
      titulo: `Subiste al nivel ${resultado.nivel} del pase`,
      cuerpo,
      datos: { nivel: resultado.nivel, premios: resultado.premios }
    });
    io?.to(salaDe(userId)).emit('notif:nueva', guardado);
  } catch (err) {
    console.error('No se pudo avisar del nivel del pase:', err.message);
  }

  io?.to(salaDe(userId)).emit('pase:subiste', {
    nivel: resultado.nivel,
    nivelAntes: resultado.nivelAntes,
    xp: resultado.xp,
    premios: resultado.premios
  });
};

/** Suma experiencia, entrega premios y avisa. Es el unico camino para dar experiencia. */
const dar = async (userId, cuanta, motivo) => {
  const resultado = await Pase.sumarXp(userId, cuanta, motivo);
  await avisarDeNiveles(userId, resultado);
  return resultado;
};

/** Hace avanzar una mision y avisa si se completo alguna. */
const avanzar = async (userId, evento, cuanto = 1) => {
  const hechas = await Mision.avanzar(userId, evento, cuanto);

  for (const mision of hechas) {
    try {
      const guardado = await Notificacion.crear({
        userId,
        tipo: Notificacion.TIPO.PASE,
        titulo: 'Misión cumplida',
        cuerpo: `${mision.texto} · +${mision.xp} de experiencia`,
        datos: { mision: mision.clave, xp: mision.xp }
      });
      io?.to(salaDe(userId)).emit('notif:nueva', guardado);
    } catch (err) {
      console.error('No se pudo avisar de la misión:', err.message);
    }
    await avisarDeNiveles(userId, mision.resultado);
  }

  return hechas;
};

// ------------------------------------------------------------ los enganches

/**
 * Una partida que termino.
 *
 * `jugadores` viene de RoomManager: `{ userId, gano }`. Los bots no entran aqui.
 */
export const alTerminarPartida = async ({ jugadores, modo, conBots, puntosDelRival = {} }) => {
  for (const j of jugadores) {
    if (!j.userId) continue;

    try {
      // Un invitado que ya jugo su primera partida confirma a quien lo trajo.
      await confirmarPana(j.userId);

      const xp = await xpDeLaPartida(j.userId, j.gano, conBots);
      if (xp > 0) await dar(j.userId, xp, conBots ? 'partida-bot' : 'partida');

      await avanzar(j.userId, 'partida');
      if (modo === '2v2') await avanzar(j.userId, 'partida-2v2');

      if (j.gano) {
        await avanzar(j.userId, 'victoria');
        if (!conBots) await avanzar(j.userId, 'victoria-personas');
        if (Number(puntosDelRival[j.userId] ?? 999) < 30) await avanzar(j.userId, 'paliza');
      }
    } catch (err) {
      console.error('El pase no pudo procesar la partida de', j.userId, err.message);
    }
  }
};

/**
 * Cuanta experiencia deja esta partida, respetando el tope de los bots.
 *
 * El tope se guarda como un contador del dia en la misma tabla de las misiones:
 * es exactamente la misma forma (persona + clave + periodo) y no hace falta otra
 * tabla para lo mismo.
 */
const xpDeLaPartida = async (userId, gano, conBots) => {
  if (!conBots) return gano ? XP_VICTORIA : XP_DERROTA;

  const dia = Pase.diaActual();
  const { progreso } = await Mision.contador(userId, CLAVE_TOPE_BOTS, dia);
  const queda = TOPE_BOTS_DIA - progreso;
  if (queda <= 0) return 0;

  const xp = Math.min(queda, gano ? XP_VICTORIA_BOT : XP_DERROTA_BOT);
  await Mision.sumarContador(userId, CLAVE_TOPE_BOTS, dia, xp);
  return xp;
};

/** Se anoto y jugo un torneo. */
export const alJugarTorneo = async (userId) => {
  try {
    await avanzar(userId, 'torneo-jugado');
  } catch (err) {
    console.error('El pase no pudo anotar el torneo:', err.message);
  }
};

/** Gano un torneo. */
export const alGanarTorneo = async (userId) => {
  try {
    await avanzar(userId, 'torneo-ganado');
  } catch (err) {
    console.error('El pase no pudo anotar el torneo ganado:', err.message);
  }
};

/** Escribio en el chat global. */
export const alEscribirEnElChat = async (userId) => {
  try {
    await avanzar(userId, 'mensaje-chat');
  } catch (err) {
    console.error('El pase no pudo anotar el mensaje:', err.message);
  }
};

/**
 * Se registro alguien con el link de otro.
 *
 * Todavia no paga nada: el premio se cobra cuando el invitado juega.
 */
export const alRegistrarse = async (userId, nombreDelInvitador) => {
  if (!nombreDelInvitador) return false;
  try {
    return await Invitacion.registrar(nombreDelInvitador, userId);
  } catch (err) {
    console.error('No se pudo anotar la invitación:', err.message);
    return false;
  }
};

/**
 * El invitado jugo: se le paga al que lo trajo.
 *
 * Devuelve el id del padrino si acaba de cobrar, o null.
 */
export const confirmarPana = async (invitadoId) => {
  const padrino = await Invitacion.confirmar(invitadoId);
  if (!padrino) return null;

  await dar(padrino, XP_POR_PANA, 'pana');
  await avanzar(padrino, 'amigo-confirmado');

  try {
    const guardado = await Notificacion.crear({
      userId: padrino,
      tipo: Notificacion.TIPO.PASE,
      titulo: 'Tu pana ya jugó',
      cuerpo: `Se sumó por tu link y ya jugó su primera partida. +${XP_POR_PANA} de experiencia.`
    });
    io?.to(salaDe(padrino)).emit('notif:nueva', guardado);
  } catch (err) {
    console.error('No se pudo avisar del pana:', err.message);
  }

  return padrino;
};

/** Todo lo que necesita la pantalla del pase. */
export const estadoPara = async (userId) => {
  const [progreso, misiones, panas] = await Promise.all([
    Pase.de(userId),
    Mision.estadoDe(userId),
    Invitacion.deInvitador(userId)
  ]);

  return {
    temporada: Pase.ventanaDeTemporada(),
    niveles: Pase.NIVELES,
    xpPorNivel: Pase.XP_POR_NIVEL,
    paseOroActivo: Pase.PASE_ORO_ACTIVO,
    premios: Pase.PREMIOS,
    xp: progreso.xp,
    nivel: progreso.nivel,
    misiones,
    panas,
    xpPorPana: XP_POR_PANA
  };
};
