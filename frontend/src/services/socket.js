import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

let socket = null;

export const connectSocket = () => {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const token = localStorage.getItem('token');
  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: { token: token || '' },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

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
