/**
 * El chat de la mesa: hablar con los que estan jugando la partida.
 *
 * Pedido de Jonathan: *"mete chat en la partida entre jugadores"*.
 *
 * ## En que se diferencia del chat global
 *
 * | | global | de mesa |
 * | --- | --- | --- |
 * | quien lo ve | todo el que entra al menu | los de esa mesa |
 * | donde se guarda | en la base de datos | en memoria, y muere con la mesa |
 * | quien escribe | cualquiera con nombre | los que estan sentados |
 *
 * **No se guarda en la base.** Lo que se dice en una mesa muere con la mesa: es
 * conversacion de partida, no historial. Guardar cada "juega rapido pana"
 * llenaria la base de ruido que nadie va a leer nunca mas.
 *
 * Se queda una copia corta en memoria para el que se reconecta: si se le fue el
 * internet un momento, al volver ve lo que se dijo mientras no estaba. Se va
 * sola cuando la mesa se cierra.
 *
 * ## Solo entre personas
 *
 * En los modos contra la maquina no se enciende. No hay con quien hablar, y un
 * chat vacio en la mesa es un boton que solo estorba.
 *
 * ## Los frenos son los mismos del chat global
 *
 * Un chat sin frenos se llena de basura el primer dia. Todos se aplican en el
 * SERVIDOR, asi que no se pueden saltar desde el navegador.
 */

import * as Config from '../models/Config.js';
import * as ChatGlobal from '../models/ChatGlobal.js';
import * as guardianes from '../services/guardianes.js';
import { limpiar as moderar } from '../services/moderacionDelChat.js';

/** Lo mas largo que puede ser un mensaje. En una mesa se habla corto. */
const LARGO_MAXIMO = 160;

/** Cuanto hay que esperar entre un mensaje y el siguiente. */
const ESPERA_ENTRE_MENSAJES_MS = 1200;

/** Y cuantos como mucho por minuto, para el que respeta la espera y aun asi inunda. */
const MAXIMO_POR_MINUTO = 12;

/** Cuantos mensajes se recuerdan por mesa, para el que se reconecta. */
const RECUERDO = 25;

/** Cuantos trae la TIRA que sale al abrir el chat (seccion 201, ficha 5.2). */
export const EN_LA_TIRA = 5;

/**
 * Lo que se dijo en cada mesa. Clave: el codigo de la sala.
 *
 * Vive aqui y no en la sala porque el chat no es parte del juego: si mañana se
 * quita, no hay que tocar nada del RoomManager.
 */
const historial = new Map();

/** Cuando hablo cada uno por ultima vez, por id de cuenta. */
const ultimoMensaje = new Map();
const mensajesDelMinuto = new Map();

// Barrido: se tira lo de quien no habla hace rato y las mesas que ya no existen.
const barrido = setInterval(() => {
  const ahora = Date.now();
  for (const [id, cuando] of ultimoMensaje) {
    if (ahora - cuando > 10 * 60_000) {
      ultimoMensaje.delete(id);
      mensajesDelMinuto.delete(id);
    }
  }
}, 5 * 60_000);
barrido.unref?.();

/** Se llama cuando una mesa se cierra: lo dicho ahi no le sirve ya a nadie. */
export const olvidarMesa = (code) => historial.delete(code);

const puedeEscribir = (userId) => {
  const ahora = Date.now();

  const anterior = ultimoMensaje.get(userId) ?? 0;
  if (ahora - anterior < ESPERA_ENTRE_MENSAJES_MS) {
    return 'Espera un segundo antes de escribir otra vez';
  }

  const recientes = (mensajesDelMinuto.get(userId) ?? []).filter((t) => ahora - t < 60_000);
  if (recientes.length >= MAXIMO_POR_MINUTO) {
    return 'Estás escribiendo demasiado rápido';
  }

  ultimoMensaje.set(userId, ahora);
  mensajesDelMinuto.set(userId, [...recientes, ahora]);
  return null;
};

const limpiar = (texto) =>
  typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim().slice(0, LARGO_MAXIMO) : '';

/** Como en el salon: el que llega sin id de navegador solo lee. */
const ID_ESTABLE = /^guest-[a-z0-9]{6,40}$/i;
const esCuenta = (id) => /^\d+$/.test(String(id));
const identidadEstable = (socket) =>
  Boolean(socket.userId) && (!socket.isGuest || (ID_ESTABLE.test(socket.userId) && socket.userId !== `guest-${socket.id}`));

/**
 * Quien puede escribir en la mesa (ficha 5.2, la llave «abrirlo a todos»): con
 * la llave, cualquiera sentado con nombre; sin ella, solo los que tienen
 * cuenta. El que no tiene identidad estable nunca.
 */
const puedeHablar = (socket) => {
  if (!identidadEstable(socket)) return 'Ponte un nombre en el umbral para escribir.';
  if (!Config.valor('chatMesa.paraTodos') && !esCuenta(socket.userId)) {
    return 'Por ahora escriben los que tienen cuenta.';
  }
  return null;
};

/** Los que estan callados en el salon: ni escriben ni salen en la tira. */
const callados = new Set();
const estaCallado = async (userId) => {
  try {
    const s = await ChatGlobal.silencioVigente(userId);
    if (s) callados.add(String(userId)); else callados.delete(String(userId));
    return Boolean(s);
  } catch {
    return callados.has(String(userId));
  }
};

/** La tira: lo ultimo de ESTA partida, sin lo del que esta callado. */
const tiraDe = (code) =>
  (historial.get(code) ?? []).filter((m) => !callados.has(String(m.userId))).slice(-EN_LA_TIRA);

/**
 * ¿Este socket esta sentado en esa mesa?
 *
 * Se comprueba contra la sala del RoomManager y no contra lo que diga el
 * navegador: si no, cualquiera con el codigo de una mesa podria escribirle a
 * gente que esta jugando.
 */
const estaSentado = (roomManager, code, userId) => {
  const room = roomManager.rooms.get(code);
  if (!room) return null;
  const jugador = room.players.find((p) => !p.isBot && String(p.id) === String(userId));
  return jugador ? room : null;
};

/** Los modos contra la maquina no llevan chat: no hay con quien hablar. */
const esEntrePersonas = (room) => (room.config?.bots ?? 0) === 0;

export function registrarChatDeMesa(io, socket, roomManager) {
  socket.on('mesa:chat:entrar', ({ code } = {}, callback) => {
    const room = estaSentado(roomManager, code, socket.userId);
    if (!room || !esEntrePersonas(room) || !Config.valor('chatMesa.activo')) {
      return callback?.({ ok: false, mensajes: [], tira: [], puedoEscribir: false });
    }
    callback?.({
      ok: true,
      mensajes: (historial.get(code) ?? []).filter((m) => !callados.has(String(m.userId))),
      tira: tiraDe(code),
      puedoEscribir: puedeHablar(socket) === null,
      burbujaMs: Config.valor('chatMesa.burbujaMs')
    });
  });

  // LA TIRA (ficha 5.2): al abrir el chat sale lo ultimo de esta partida con
  // quien lo dijo. Se pide aparte para que salga al dia aunque el panel lleve
  // rato cerrado.
  socket.on('mesa:chat:tira', ({ code } = {}, callback) => {
    const room = estaSentado(roomManager, code, socket.userId);
    if (!room) return callback?.({ ok: false, tira: [] });
    callback?.({ ok: true, tira: tiraDe(code) });
  });

  socket.on('mesa:chat:enviar', async ({ code, texto } = {}, callback) => {
    if (!Config.valor('chatMesa.activo')) {
      return callback?.({ ok: false, error: 'El chat de la mesa está apagado' });
    }
    const puerta = puedeHablar(socket);
    if (puerta) return callback?.({ ok: false, error: puerta });

    const room = estaSentado(roomManager, code, socket.userId);
    if (!room) return callback?.({ ok: false, error: 'No estás en esa mesa' });
    if (!esEntrePersonas(room)) {
      return callback?.({ ok: false, error: 'En las partidas contra la máquina no hay chat' });
    }

    const limpio = limpiar(texto);
    if (!limpio) return callback?.({ ok: false, error: 'El mensaje está vacío' });

    if (await estaCallado(socket.userId)) {
      return callback?.({ ok: false, error: 'Estás suspendido del chat. Puedes leer, pero no escribir.' });
    }

    const freno = puedeEscribir(socket.userId);
    if (freno) return callback?.({ ok: false, error: freno });

    // La misma moderacion del salon: enlaces fuera, groserias tapadas, gritos
    // en minusculas. Y los guardianes miran (ficha 3.3).
    const { visible, quitoContacto, tapoGroserias } = moderar(limpio);
    guardianes.alModerar({ userId: socket.userId, username: socket.username, texto: visible, tapoGroserias, quitoContacto });
    if (!visible) return callback?.({ ok: false, error: 'Ese mensaje quedó vacío' });

    const mensaje = {
      id: `${Date.now()}-${socket.userId}`,
      userId: socket.userId,
      // El nombre sale del token (o de la identidad que verifico el middleware),
      // NO de lo que manda el navegador: si no, cualquiera se hace pasar por otro.
      username: socket.username,
      retrato: socket.retrato ?? null,
      asiento: room.players.find((p) => String(p.id) === String(socket.userId))?.asiento ?? null,
      texto: visible,
      creadoEn: new Date().toISOString()
    };

    const previos = historial.get(code) ?? [];
    historial.set(code, [...previos, mensaje].slice(-RECUERDO));

    io.to(code).emit('mesa:chat:mensaje', mensaje);
    callback?.({ ok: true, seQuitoContacto: quitoContacto });
  });
}
