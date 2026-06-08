import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import { roomManager } from './RoomManager.js';
import { setupGameSocket } from './sockets/gameSocket.js';

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'domino-backend' });
});

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'dominó online', rooms: roomManager.rooms.size });
});

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

roomManager.setIO(io);
setupGameSocket(io, roomManager);

const presence = new Map();

const broadcastPresence = () => {
  const loggedIn = new Set();
  for (const [, info] of presence) {
    if (!info.isGuest) loggedIn.add(info.userId);
  }
  io.emit('presence:count', {
    total: presence.size,
    loggedIn: loggedIn.size,
    guests: presence.size - loggedIn.size
  });
};

io.on('connection', (socket) => {
  const userId = socket.userId || `guest-${socket.id}`;
  const username = socket.username || 'Invitado';
  const isGuest = !!socket.isGuest;
  presence.set(socket.id, { userId, username, isGuest });
  broadcastPresence();

  socket.on('disconnect', () => {
    presence.delete(socket.id);
    broadcastPresence();
  });
});

import { initDatabase } from './config/database.js';

await initDatabase();

server.listen(PORT, HOST, () => {
  const address = server.address();
  const url = typeof address === 'string' ? address : `http://${address.address}:${address.port}`;
  console.log(`🎲 Servidor de dominó corriendo en ${url}`);
});

// Evitar que el servidor de Render se duerma haciendo un auto-ping cada 13 minutos
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  console.log(`🤖 Auto-ping de Render activado para: ${RENDER_URL}`);
  
  // Ping inicial de calentamiento a los 10 segundos del arranque
  setTimeout(async () => {
    try {
      const response = await fetch(`${RENDER_URL}/api/health`);
      if (response.ok) {
        console.log('🤖 Self-ping inicial de Render exitoso');
      } else {
        console.warn(`🤖 Self-ping inicial de Render retornó status: ${response.status}`);
      }
    } catch (error) {
      console.warn('🤖 Error en self-ping inicial de Render:', error.message);
    }
  }, 10000);

  // Intervalo recurrente cada 13 minutos (Render free tier se apaga tras 15 minutos idle)
  setInterval(async () => {
    try {
      const response = await fetch(`${RENDER_URL}/api/health`);
      if (response.ok) {
        console.log('🤖 Self-ping periódico de Render exitoso');
      }
    } catch (error) {
      console.error('❌ Error en self-ping periódico de Render:', error.message);
    }
  }, 13 * 60 * 1000);
}
