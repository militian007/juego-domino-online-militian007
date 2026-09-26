import * as Notificacion from '../models/Notificacion.js';
import { TIPO } from '../models/Notificacion.js';

/** Cuanto vive un reto sin contestar. */
const VIGENCIA_MS = 60_000;

/** Cuanto hay que esperar entre un reto y el siguiente. */
const ESPERA_ENTRE_RETOS_MS = 5_000;

/**
 * Retos entre jugadores, y el buzon de avisos.
 *
 * ## Por que los retos NO se guardan en la base
 *
 * Un reto vive un minuto. Guardarlo seria llenar una tabla de cosas muertas y
 * tener que limpiarlas. Lo que si se guarda es el AVISO: si te retaron mientras
 * no estabas, al volver ves que te retaron aunque el reto ya no sirva.
 *
 * ## Quien puede retar
 *
 * Cualquiera con identidad estable (seccion 199: sin cuentas, el asiento es por
 * token como en el ludo). Y solo a alguien que este en linea: un reto a quien
 * no esta no lo va a contestar nadie. El aviso en el buzon solo se guarda para
 * las cuentas (la tabla de avisos lleva id numerico); al invitado le llega en
 * vivo, que es lo que importa en un reto de un minuto.
 */
const ID_ESTABLE = /^guest-[a-z0-9]{6,40}$/i;
const esCuenta = (id) => /^\d+$/.test(String(id));

/** Los retos vivos, por id. */
const retos = new Map();

/** Cuando fue el ultimo reto de cada uno, para que no se pueda acosar. */
const ultimoReto = new Map();

let contador = 0;

const salaDe = (userId) => `user:${userId}`;

/** ¿Esta esta persona conectada ahora mismo? */
const estaEnLinea = (io, userId) => {
  const sala = io.sockets.adapter.rooms.get(salaDe(userId));
  return Boolean(sala && sala.size > 0);
};

/** Le manda un aviso a alguien: se guarda y, si esta, le llega al momento. */
const avisar = async (io, userId, aviso) => {
  if (!esCuenta(userId)) return null;
  const guardado = await Notificacion.crear({ userId, ...aviso });
  io.to(salaDe(userId)).emit('notif:nueva', guardado);
  Notificacion.podar(userId).catch(() => {});
  return guardado;
};

const cerrarReto = (id) => {
  const reto = retos.get(id);
  if (!reto) return null;
  clearTimeout(reto._vence);
  retos.delete(id);
  return reto;
};

export function registrarRetos(io, socket, roomManager) {
  // Cada cuenta tiene su propia sala. Es lo que permite mandarle algo a una
  // PERSONA sin saber en que pestaña esta ni cuantas tiene abiertas.
  const identidadEstable = Boolean(socket.userId) && (!socket.isGuest || (ID_ESTABLE.test(socket.userId) && socket.userId !== `guest-${socket.id}`));
  if (identidadEstable) {
    socket.join(salaDe(socket.userId));
  }

  const quienSoy = () => (identidadEstable ? { id: socket.userId, nombre: socket.username } : null);

  // ------------------------------------------------------------ el buzon
  socket.on('notif:listar', async (callback) => {
    const yo = quienSoy();
    if (!yo) return callback?.({ ok: true, notificaciones: [], sinLeer: 0 });

    try {
      const [notificaciones, cuantasSinLeer] = await Promise.all([
        Notificacion.deUsuario(yo.id),
        Notificacion.sinLeer(yo.id)
      ]);
      callback?.({ ok: true, notificaciones, sinLeer: cuantasSinLeer });
    } catch (err) {
      console.error('Error leyendo el buzon:', err.message);
      callback?.({ ok: false, error: 'No se pudo cargar el buzón' });
    }
  });

  socket.on('notif:marcar-leidas', async (callback) => {
    const yo = quienSoy();
    if (!yo) return callback?.({ ok: true });
    try {
      await Notificacion.marcarTodasLeidas(yo.id);
      callback?.({ ok: true });
    } catch {
      callback?.({ ok: false });
    }
  });

  // ------------------------------------------------------------ retar
  socket.on('reto:enviar', async ({ paraId, paraNombre } = {}, callback) => {
    const yo = quienSoy();
    if (!yo) return callback?.({ ok: false, error: 'Inicia sesión para retar a alguien' });

    const destino = esCuenta(paraId) ? Number(paraId) : String(paraId || '');
    if (!destino || (typeof destino === 'string' && !ID_ESTABLE.test(destino))) {
      return callback?.({ ok: false, error: 'No sé a quién quieres retar' });
    }
    if (String(destino) === String(yo.id)) {
      return callback?.({ ok: false, error: 'No puedes retarte a ti mismo' });
    }
    if (!estaEnLinea(io, destino)) {
      return callback?.({ ok: false, error: `${paraNombre || 'Esa persona'} no está en línea` });
    }

    const ahora = Date.now();
    if (ahora - (ultimoReto.get(yo.id) ?? 0) < ESPERA_ENTRE_RETOS_MS) {
      return callback?.({ ok: false, error: 'Espera un momento antes de retar de nuevo' });
    }

    // Un solo reto vivo por pareja: si no, se puede llenar el buzon del otro.
    for (const r of retos.values()) {
      if (String(r.deId) === String(yo.id) && String(r.paraId) === String(destino)) {
        return callback?.({ ok: false, error: 'Ya lo retaste, espera que conteste' });
      }
    }

    ultimoReto.set(yo.id, ahora);

    const id = `reto-${++contador}-${ahora}`;
    const reto = {
      id,
      deId: yo.id,
      deNombre: yo.nombre,
      paraId: destino,
      paraNombre: paraNombre || 'Alguien',
      vence: ahora + VIGENCIA_MS
    };

    reto._vence = setTimeout(async () => {
      if (!retos.has(id)) return;
      retos.delete(id);
      io.to(salaDe(destino)).emit('reto:cerrado', { id, motivo: 'vencido' });
      await avisar(io, reto.deId, {
        tipo: TIPO.RETO_VENCIDO,
        titulo: 'Tu reto venció',
        cuerpo: `${reto.paraNombre} no contestó a tiempo.`,
        datos: { retoId: id }
      });
    }, VIGENCIA_MS);
    reto._vence.unref?.();

    retos.set(id, reto);

    io.to(salaDe(destino)).emit('reto:recibido', {
      id, deId: yo.id, deNombre: yo.nombre, vence: reto.vence, restanteMs: VIGENCIA_MS
    });

    await avisar(io, destino, {
      tipo: TIPO.RETO,
      titulo: `${yo.nombre} te retó a jugar`,
      cuerpo: '1 vs 1. Tienes un minuto para contestar.',
      datos: { retoId: id, deId: yo.id, deNombre: yo.nombre }
    });

    callback?.({ ok: true, id, restanteMs: VIGENCIA_MS });
  });

  // ------------------------------------------------------------ contestar
  socket.on('reto:responder', async ({ id, acepto } = {}, callback) => {
    const yo = quienSoy();
    if (!yo) return callback?.({ ok: false, error: 'Inicia sesión' });

    const reto = retos.get(id);
    if (!reto) return callback?.({ ok: false, error: 'Ese reto ya no está disponible' });
    if (String(reto.paraId) !== String(yo.id)) {
      return callback?.({ ok: false, error: 'Ese reto no es tuyo' });
    }

    cerrarReto(id);

    if (!acepto) {
      io.to(salaDe(reto.deId)).emit('reto:cerrado', { id, motivo: 'rechazado' });
      await avisar(io, reto.deId, {
        tipo: TIPO.RETO_RECHAZADO,
        titulo: `${yo.nombre} no aceptó`,
        cuerpo: 'Prueba con otro, o busca partida rápida.',
        datos: { retoId: id }
      });
      return callback?.({ ok: true, acepto: false });
    }

    // Se acepto: se arma una sala privada y se les manda el codigo a los dos.
    try {
      const sala = roomManager.createRoom({
        mode: '1v1',
        hostId: reto.deId,
        hostUsername: reto.deNombre
      });

      io.to(salaDe(reto.deId)).emit('reto:aceptado', {
        id, code: sala.code, contra: yo.nombre
      });
      io.to(salaDe(yo.id)).emit('reto:aceptado', {
        id, code: sala.code, contra: reto.deNombre
      });

      await avisar(io, reto.deId, {
        tipo: TIPO.RETO_ACEPTADO,
        titulo: `${yo.nombre} aceptó tu reto`,
        cuerpo: 'La mesa está lista.',
        datos: { retoId: id, code: sala.code }
      });

      callback?.({ ok: true, acepto: true, code: sala.code });
    } catch (err) {
      console.error('No se pudo armar la sala del reto:', err.message);
      callback?.({ ok: false, error: 'No se pudo armar la mesa' });
    }
  });
}
