import * as ChatGlobal from '../models/ChatGlobal.js';

/**
 * El chat del menu principal.
 *
 * Decision de Jonathan (4 de septiembre de 2026): **escribe el que tiene
 * cuenta, el invitado lee**. El motivo es de moderacion: si cualquiera escribe
 * sin cuenta, cuando alguien se porta mal no hay a quien callar, porque se va y
 * vuelve siendo otro. Y de paso es un motivo para registrarse.
 *
 * ## Los frenos
 *
 * Un chat abierto a internet sin frenos se llena de basura el primer dia. Van
 * tres, y ninguno de los tres se puede saltear desde el navegador porque todos
 * se aplican en el servidor:
 *
 * 1. Largo maximo, para que nadie pegue una pared de texto.
 * 2. Un mensaje cada segundo y medio, para que nadie inunde la lista.
 * 3. Quince mensajes por minuto, para el que respeta el segundo y medio pero
 *    igual escribe sin parar.
 */

const ESPERA_ENTRE_MENSAJES_MS = 1500;
const MAXIMO_POR_MINUTO = 15;

/**
 * Cuando le toca hablar a cada uno.
 *
 * Va por id de cuenta y NO se borra al desconectarse. Si se borrara, el freno
 * no serviria para nada: al que lo frenan cierra la pestaña, vuelve a entrar y
 * sigue inundando el chat. Se limpia sola por tiempo, mas abajo.
 */
const ultimoMensaje = new Map();
const mensajesDelMinuto = new Map();

// Barrido cada cinco minutos para que estos mapas no crezcan para siempre. Se
// tira lo de quien no escribe hace rato, que ya no tiene freno que aplicar.
const barrido = setInterval(() => {
  const ahora = Date.now();
  for (const [id, cuando] of ultimoMensaje) {
    if (ahora - cuando > 5 * 60_000) {
      ultimoMensaje.delete(id);
      mensajesDelMinuto.delete(id);
    }
  }
}, 5 * 60_000);

// Sin esto el proceso no termina nunca al apagar el servidor.
barrido.unref?.();

const puedeEscribir = (userId) => {
  const ahora = Date.now();

  const anterior = ultimoMensaje.get(userId) ?? 0;
  if (ahora - anterior < ESPERA_ENTRE_MENSAJES_MS) {
    return 'Esperá un segundo antes de escribir otra vez';
  }

  const recientes = (mensajesDelMinuto.get(userId) ?? []).filter((t) => ahora - t < 60_000);
  if (recientes.length >= MAXIMO_POR_MINUTO) {
    return 'Estás escribiendo demasiado rápido, esperá un minuto';
  }

  ultimoMensaje.set(userId, ahora);
  mensajesDelMinuto.set(userId, [...recientes, ahora]);
  return null;
};

/**
 * Quien es el que habla.
 *
 * Se lee de lo que ya dejo puesto el middleware del socket al conectarse, que
 * es quien verifica el token firmado. NO se vuelve a verificar aca a proposito:
 *
 * El primer intento tenia su propia copia del secreto, y la copia decia
 * `dev-secret-change-me` mientras el resto del proyecto usa `dev-secret`. En
 * local, donde la variable de entorno no esta puesta, el resultado era que
 * NINGUNA cuenta podia escribir: el token valia para el juego y no valia para
 * el chat. Un secreto repetido en dos archivos es un secreto que en algun
 * momento va a estar distinto en los dos.
 *
 * El nombre tampoco se toma de lo que manda el navegador: viene del token que
 * ya verifico el middleware. Si se confiara en lo que llega, cualquiera
 * escribiria haciendose pasar por otro con solo cambiar un campo.
 */
const identificar = (socket) => {
  if (socket.isGuest) return null;
  if (!socket.userId || !socket.username) return null;
  return { userId: socket.userId, username: socket.username };
};

export function registrarChat(io, socket) {
  // El historial lo recibe cualquiera, tenga cuenta o no: el invitado lee.
  socket.on('chat:entrar', async () => {
    try {
      socket.join('chat-global');
      const mensajes = await ChatGlobal.ultimos();
      socket.emit('chat:historial', {
        mensajes,
        puedoEscribir: Boolean(identificar(socket))
      });
    } catch (err) {
      console.error('Error cargando el chat:', err.message);
      socket.emit('chat:historial', { mensajes: [], puedoEscribir: false });
    }
  });

  socket.on('chat:enviar', async ({ texto } = {}) => {
    const quien = identificar(socket);
    if (!quien) {
      return socket.emit('chat:error', { mensaje: 'Iniciá sesión para escribir' });
    }

    const limpio = ChatGlobal.limpiar(texto);
    if (!limpio) {
      return socket.emit('chat:error', { mensaje: 'El mensaje está vacío' });
    }

    const freno = puedeEscribir(quien.userId);
    if (freno) {
      return socket.emit('chat:error', { mensaje: freno });
    }

    try {
      const mensaje = await ChatGlobal.guardar({
        userId: quien.userId,
        username: quien.username,
        texto: limpio
      });

      io.to('chat-global').emit('chat:mensaje', mensaje);

      // De vez en cuando se tira lo viejo. No en cada mensaje: seria una
      // escritura de mas por cada cosa que alguien dice.
      if (mensaje.id && mensaje.id % 50 === 0) {
        ChatGlobal.podar().catch(() => {});
      }
    } catch (err) {
      console.error('Error guardando mensaje del chat:', err.message);
      socket.emit('chat:error', { mensaje: 'No se pudo enviar, probá de nuevo' });
    }
  });

}
