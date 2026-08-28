import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

let socket = null;

const CLAVE_INVITADO = 'domino-guest-id';

/**
 * Id de invitado estable, guardado en el navegador. Sin esto el servidor te
 * trata como un jugador nuevo en cada conexion y perdes la partida al
 * refrescar o al salir a otra app.
 */
export function idDeInvitado() {
  try {
    let id = localStorage.getItem(CLAVE_INVITADO);
    if (!id || !/^guest-[a-z0-9]{6,40}$/i.test(id)) {
      id = 'guest-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
      localStorage.setItem(CLAVE_INVITADO, id);
    }
    return id;
  } catch {
    return null;
  }
}

export const connectSocket = (tokenOverride) => {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const token = tokenOverride !== undefined ? tokenOverride : localStorage.getItem('token');
  const opts = {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  };
  if (token) {
    opts.auth = { token };
  } else {
    const invitado = idDeInvitado();
    if (invitado) opts.auth = { guestId: invitado };
  }
  socket = io(SOCKET_URL, opts);

  socket.on('connect', () => {
    console.log('🟢 Socket conectado:', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket desconectado:', reason);
  });
  socket.on('connect_error', (err) => {
    console.error('❌ Error de conexión socket:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
