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
 * | quien escribe | el que tiene cuenta | los que estan sentados |
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

/** Lo mas largo que puede ser un mensaje. En una mesa se habla corto. */
const LARGO_MAXIMO = 160;

/** Cuanto hay que esperar entre un mensaje y el siguiente. */
const ESPERA_ENTRE_MENSAJES_MS = 1200;

/** Y cuantos como mucho por minuto, para el que respeta la espera y aun asi inunda. */
const MAXIMO_POR_MINUTO = 12;

/** Cuantos mensajes se recuerdan por mesa, para el que se reconecta. */
const RECUERDO = 25;

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
    return 'Esperá un segundo antes de escribir otra vez';
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
    if (!room || !esEntrePersonas(room)) {
      return callback?.({ ok: false, mensajes: [], puedoEscribir: false });
    }
    callback?.({ ok: true, mensajes: historial.get(code) ?? [], puedoEscribir: true });
  });

  socket.on('mesa:chat:enviar', ({ code, texto } = {}, callback) => {
    if (socket.isGuest || !socket.userId) {
      return callback?.({ ok: false, error: 'Iniciá sesión para escribir' });
    }

    const room = estaSentado(roomManager, code, socket.userId);
    if (!room) return callback?.({ ok: false, error: 'No estás en esa mesa' });
    if (!esEntrePersonas(room)) {
      return callback?.({ ok: false, error: 'En las partidas contra la máquina no hay chat' });
    }

    const limpio = limpiar(texto);
    if (!limpio) return callback?.({ ok: false, error: 'El mensaje está vacío' });

    const freno = puedeEscribir(socket.userId);
    if (freno) return callback?.({ ok: false, error: freno });

    const mensaje = {
      id: `${Date.now()}-${socket.userId}`,
      userId: socket.userId,
      // El nombre sale del token que ya verifico el middleware, NO de lo que
      // manda el navegador: si no, cualquiera escribe haciendose pasar por otro.
      username: socket.username,
      texto: limpio,
      creadoEn: new Date().toISOString()
    };

    const previos = historial.get(code) ?? [];
    historial.set(code, [...previos, mensaje].slice(-RECUERDO));

    io.to(code).emit('mesa:chat:mensaje', mensaje);
    callback?.({ ok: true });
  });
}
