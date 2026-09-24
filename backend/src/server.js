import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import buzonRoutes from './routes/buzon.js';
import configRoutes from './routes/config.js';
import pamRoutes from './routes/pam.js';
import * as Config from './models/Config.js';
import perfilRoutes from './routes/perfil.js';
import rankingRoutes from './routes/ranking.js';
import torneosRoutes from './routes/torneos.js';
import desbloqueosRoutes from './routes/desbloqueos.js';
import monedasRoutes from './routes/monedas.js';
import tiendaRoutes from './routes/tienda.js';
import paseRoutes from './routes/pase.js';
import diagRoutes from './routes/diag.js';
import { roomManager } from './RoomManager.js';
import { setupGameSocket } from './sockets/gameSocket.js';
import { registrarChat } from './sockets/chatSocket.js';
import { registrarChatDeMesa } from './sockets/mesaChat.js';
import { registrarRetos } from './sockets/retosSocket.js';
import * as torneos from './services/torneos.js';
import * as pase from './services/pase.js';

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * UNA SOLA MAQUINA (seccion 204): en Replit el servidor sirve tambien la
 * pantalla ya construida (`frontend/dist`). Asi la pantalla y el servidor
 * viven en la misma direccion: nada de CORS, el socket va por la misma puerta
 * y el enlace es uno solo. Si no hay `dist` (en la PC, con Vite aparte), todo
 * sigue como siempre.
 */
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
const HAY_PANTALLA = fs.existsSync(path.join(DIST, 'index.html'));

app.use(cors({
  origin: HAY_PANTALLA ? true : CLIENT_URL,
  credentials: true
}));
app.use(express.json());

if (!HAY_PANTALLA) {
  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'domino-backend' });
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/buzon', buzonRoutes);
app.use('/api/config', configRoutes);
app.use('/api/pam', pamRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/torneos', torneosRoutes);
app.use('/api/desbloqueos', desbloqueosRoutes);
app.use('/api/monedas', monedasRoutes);
app.use('/api/tienda', tiendaRoutes);
app.use('/api/pase', paseRoutes);
app.use('/api/diag', diagRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'dominó online', rooms: roomManager.rooms.size });
});

if (HAY_PANTALLA) {
  // Los archivos con huella en el nombre (assets/…) se guardan un año; el
  // index.html y el service worker, nunca: si no, el telefono se queda con la
  // version vieja (la leccion de la PWA del truco).
  app.use(express.static(DIST, {
    index: false,
    setHeaders: (res, archivo) => {
      if (/[\\/]assets[\\/]/.test(archivo)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(archivo)) res.setHeader('Cache-Control', 'no-cache');
    }
  }));
  // Cualquier otra ruta que no sea del servidor es de la pantalla (React Router).
  app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

const io = new Server(server, {
  cors: {
    // En una sola maquina la pantalla llega por la misma puerta (seccion 204).
    origin: HAY_PANTALLA ? true : CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

roomManager.setIO(io);

// El reloj de los torneos: deja anunciados los proximos y arranca los que les
// llego la hora.
torneos.encender(io, roomManager);

// El pase de batalla necesita el io para avisar en el momento de que alguien
// subio de nivel o cumplio una mision.
pase.conectar(io);
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
  // El chat del menu principal. Va aparte del juego: se escucha desde el menu,
  // sin estar en ninguna sala.
  registrarChat(io, socket, roomManager);

  // Retos entre jugadores y el buzon de avisos.
  registrarRetos(io, socket, roomManager);

  // El chat de la mesa, para hablar con los que estan jugando la partida.
  registrarChatDeMesa(io, socket, roomManager);

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
// Las perillas: se siembran las que falten y se deja la cache lista (seccion 201).
await Config.sembrar().catch((err) => console.warn('Config: no se pudo sembrar:', err.message));

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
