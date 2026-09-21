import * as ChatGlobal from '../models/ChatGlobal.js';
import * as Preferencia from '../models/Preferencia.js';
import { nombreDe } from '../models/Titulo.js';
import * as pase from '../services/pase.js';
import { limpiar as moderar, esSpam, duracionSilencio, faltaEnPalabras } from '../services/moderacionDelChat.js';

/**
 * EL SALON (seccion 196): el chat del club fuera de la mesa, copiado del
 * truco (Raul, 20-sep: «copiate del privoytruco»). Dos pestanas: la
 * conversacion y quien esta en linea, para conseguir con quien jugar.
 *
 * Escribe el que tiene cuenta, el invitado lee (regla del truco y de Jonathan,
 * por lo mismo: sin cuenta no hay a quien callar, porque se va y vuelve
 * siendo otro; y de paso es un motivo para registrarse).
 *
 * ## Los frenos, todos en el servidor
 *
 * 1. Largo maximo (240): un parrafo no es conversacion, es un panfleto.
 * 2. La moderacion del truco (`services/moderacionDelChat.js`): se quitan
 *    enlaces, correos y telefonos; las groserias se tapan con asteriscos; los
 *    gritos se bajan a minusculas. Nunca se rechaza por contenido.
 * 3. Spam (cinco en diez segundos, o el mismo mensaje tres veces): silencio
 *    de 2 min que se duplica al reincidir, con techo de un dia. Se guarda en
 *    la base para que no se esquive cerrando la pestana.
 * 4. Cada mensaje vive dos horas (`DOMINO_CHAT_VIDA_MIN`) y despues se borra.
 *
 * ## Los socios
 *
 * Pueden bajar un mensaje, callar diez minutos, o suspender por dias con un
 * mensaje que el jugador lee. Hasta que la plataforma traiga los roles, socio
 * es quien este en `DOMINO_SOCIOS` (nombres de cuenta separados por coma).
 */

const SOCIOS = new Set(
  String(process.env.DOMINO_SOCIOS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
);

/**
 * Le pega a cada mensaje el titulo que eligio mostrar quien lo escribio, en una
 * sola consulta para toda la tanda.
 */
const conTitulos = async (mensajes) => {
  const claves = await Preferencia.titulosDe(mensajes.map((m) => m.userId));
  return mensajes.map((m) => ({ ...m, titulo: nombreDe(claves[Number(m.userId)]) }));
};

/**
 * Quien es el que habla: lo que dejo puesto el middleware del socket, que es
 * quien verifico el token. Ni se vuelve a verificar ni se le cree al navegador.
 */
const identificar = (socket) => {
  if (socket.isGuest) return null;
  if (!socket.userId || !socket.username) return null;
  return { userId: socket.userId, username: socket.username };
};

const esSocio = (socket) => Boolean(identificar(socket)) && SOCIOS.has(String(socket.username).toLowerCase());

/** ¿Esta persona esta en una partida que no ha terminado? */
const estaJugando = (roomManager, userId) => {
  for (const room of roomManager?.rooms?.values?.() ?? []) {
    if (!room.started || !room.game || room.game.status === 'game-over') continue;
    if (room.players.some((p) => p.id === userId && !p.isBot)) return true;
  }
  return false;
};

/**
 * Quien esta en linea ahora: una fila por persona (no por pestana), con si
 * esta jugando. Los invitados salen con su retrato; solo las cuentas se pueden
 * retar (el reto necesita a quien reclamarle).
 */
const gente = (io, roomManager) => {
  const porId = new Map();
  for (const s of io.sockets.sockets.values()) {
    if (!s.userId || porId.has(s.userId)) continue;
    porId.set(s.userId, {
      id: s.userId,
      username: s.username,
      esInvitado: Boolean(s.isGuest),
      retrato: s.retrato ?? null,
      jugando: estaJugando(roomManager, s.userId)
    });
  }
  return [...porId.values()].sort((a, b) => Number(a.jugando) - Number(b.jugando) || a.username.localeCompare(b.username));
};

const silencioParaElCliente = (s) => (s ? { hasta: s.hasta, mensaje: s.mensaje } : null);

export function registrarChat(io, socket, roomManager) {
  // El historial lo recibe cualquiera, tenga cuenta o no: el invitado lee.
  socket.on('chat:entrar', async () => {
    try {
      socket.join('chat-global');
      const yo = identificar(socket);
      const [mensajes, silencio] = await Promise.all([
        ChatGlobal.ultimos(),
        yo ? ChatGlobal.silencioVigente(yo.userId) : null
      ]);
      // Lo vencido se barre de vez en cuando, no en cada lectura.
      if (Math.random() < 0.1) ChatGlobal.podar().catch(() => {});
      socket.emit('chat:historial', {
        mensajes: await conTitulos(mensajes),
        puedoEscribir: Boolean(yo),
        miSilencio: silencioParaElCliente(silencio),
        soySocio: esSocio(socket),
        vidaMinutos: Math.round(ChatGlobal.vidaMs() / 60_000)
      });
    } catch (err) {
      console.error('Error cargando el chat:', err.message);
      socket.emit('chat:historial', { mensajes: [], puedoEscribir: false });
    }
  });

  socket.on('chat:enviar', async ({ texto } = {}, callback) => {
    const fallo = (mensaje, extra = {}) => {
      socket.emit('chat:error', { mensaje, ...extra });
      callback?.({ ok: false, error: mensaje, ...extra });
    };

    const quien = identificar(socket);
    if (!quien) return fallo('Crea tu cuenta para escribir en el chat.', { code: 'invitado' });

    const limpio = ChatGlobal.limpiar(texto);
    if (!limpio) return fallo('El mensaje está vacío');

    try {
      const silencio = await ChatGlobal.silencioVigente(quien.userId);
      if (silencio) {
        const falta = new Date(silencio.hasta).getTime() - Date.now();
        return fallo(
          silencio.mensaje
            ? `Tu chat está suspendido. ${silencio.mensaje} Vuelves a escribir en ${faltaEnPalabras(falta)}.`
            : `Estás en silencio. Puedes volver a escribir en ${faltaEnPalabras(falta)}.`,
          { code: 'silenciado', hasta: silencio.hasta }
        );
      }

      const recientes = await ChatGlobal.recientesDe(quien.userId);
      const spam = esSpam(limpio, { tiempos: recientes.map((r) => r.cuando), textos: recientes.map((r) => r.texto) });
      if (spam) {
        const veces = (await ChatGlobal.vecesSilenciado(quien.userId)) + 1;
        const hasta = new Date(Date.now() + duracionSilencio(veces));
        await ChatGlobal.silenciar({ userId: quien.userId, hasta, veces, motivo: spam, porUserId: null });
        const falta = hasta.getTime() - Date.now();
        return fallo(
          spam === 'repetido'
            ? `Ya dijiste eso. Descansa ${faltaEnPalabras(falta)}.`
            : `Vas muy rápido. Descansa ${faltaEnPalabras(falta)}.`,
          { code: 'silenciado', hasta: hasta.toISOString() }
        );
      }

      const { visible, quitoContacto } = moderar(limpio);
      if (!visible) return fallo('Ese mensaje quedó vacío.');

      const mensaje = await ChatGlobal.guardar({ userId: quien.userId, username: quien.username, texto: visible });
      const completo = { ...mensaje, titulo: nombreDe(await Preferencia.leer(quien.userId, Preferencia.TITULO)) };
      io.to('chat-global').emit('chat:mensaje', completo);
      // Para poder avisarle por que su mensaje salio distinto de lo que escribio.
      callback?.({ ok: true, mensaje: completo, seQuitoContacto: quitoContacto });

      // Saludar en el chat es una de las misiones diarias del pase.
      pase.alEscribirEnElChat(quien.userId).catch(() => {});
    } catch (err) {
      console.error('Error guardando mensaje del chat:', err.message);
      fallo('No se pudo enviar, prueba de nuevo');
    }
  });

  // ------------------------------------------------------------ en linea
  socket.on('salon:gente', (...args) => {
    const callback = args.find((a) => typeof a === 'function');
    callback?.({ ok: true, gente: gente(io, roomManager) });
  });

  // ------------------------------------------------------------ los socios
  socket.on('salon:ocultar', async ({ mensajeId } = {}, callback) => {
    if (!esSocio(socket)) return callback?.({ ok: false, error: 'Solo un socio' });
    try {
      await ChatGlobal.ocultar(mensajeId);
      io.to('chat-global').emit('chat:oculto', { id: Number(mensajeId) });
      callback?.({ ok: true });
    } catch (err) {
      console.error('No se pudo ocultar el mensaje:', err.message);
      callback?.({ ok: false, error: 'No se pudo ocultar' });
    }
  });

  /** Silencio corto (minutos) o suspension de dias con el mensaje que el jugador va a leer. */
  socket.on('salon:silenciar', async ({ userId, minutos, dias, mensaje } = {}, callback) => {
    if (!esSocio(socket)) return callback?.({ ok: false, error: 'Solo un socio' });
    const destino = Number(userId);
    const d = Number(dias);
    const m = Number(minutos);
    if (!Number.isInteger(destino) || destino <= 0) return callback?.({ ok: false, error: 'No sé a quién' });
    if (!(Number.isInteger(d) && d >= 1 && d <= 365) && !(Number.isInteger(m) && m >= 1 && m <= 10080)) {
      return callback?.({ ok: false, error: 'Minutos o días' });
    }
    const texto = typeof mensaje === 'string' ? mensaje.trim().slice(0, 300) : '';
    try {
      const veces = (await ChatGlobal.vecesSilenciado(destino)) + 1;
      const ms = d >= 1 ? d * 86_400_000 : m * 60_000;
      const hasta = new Date(Date.now() + ms);
      await ChatGlobal.silenciar({
        userId: destino,
        hasta,
        veces,
        motivo: texto.length >= 5 ? texto : 'admin',
        porUserId: socket.userId
      });
      // El suspendido se entera al momento, en la barra del chat.
      for (const s of io.sockets.sockets.values()) {
        if (!s.isGuest && Number(s.userId) === destino) s.emit('chat:silenciado', { hasta: hasta.toISOString(), mensaje: texto.length >= 5 ? texto : null });
      }
      callback?.({ ok: true, hasta: hasta.toISOString() });
    } catch (err) {
      console.error('No se pudo silenciar:', err.message);
      callback?.({ ok: false, error: 'No se pudo silenciar' });
    }
  });

  socket.on('salon:levantar', async ({ userId } = {}, callback) => {
    if (!esSocio(socket)) return callback?.({ ok: false, error: 'Solo un socio' });
    try {
      await ChatGlobal.levantar(Number(userId));
      for (const s of io.sockets.sockets.values()) {
        if (!s.isGuest && Number(s.userId) === Number(userId)) s.emit('chat:silenciado', null);
      }
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: 'No se pudo levantar' });
    }
  });
}

export const _soloParaPruebas = { gente, estaJugando };
