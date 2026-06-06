import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function setupGameSocket(io, roomManager) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Sin token'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      next();
    } catch (err) {
      const reason = err?.name === 'TokenExpiredError' ? 'expirado' : 'inválido';
      const message = `Token ${reason}`;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Socket auth failed:', err?.message, 'token prefix:', String(token).slice(0, 12));
      }
      next(new Error(message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🎮 ${socket.username} conectado (${socket.id})`);

    socket.on('room:create', ({ mode }, callback) => {
      try {
        const room = roomManager.createRoom({
          mode,
          hostId: socket.userId,
          hostUsername: socket.username
        });
        const player = room.players.find((p) => p.id === socket.userId);
        player.socketId = socket.id;
        socket.join(room.code);
        roomManager.broadcastLobby(room);
        callback?.({ ok: true, code: room.code, room: { code: room.code, mode: room.mode, modeLabel: room.config.label, hasPool: room.config.hasPool, players: room.players, started: room.started, maxPlayers: room.config.totalPlayers } });
      } catch (e) {
        callback?.({ ok: false, error: e.message });
      }
    });

    socket.on('room:join', ({ code }, callback) => {
      const result = roomManager.joinRoom(code, {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id
      });
      if (result.error) return callback?.({ ok: false, error: result.error });
      socket.join(code);
      const room = result.room;
      const me = room.players.find((p) => p.id === socket.userId);
      me.socketId = socket.id;
      roomManager.broadcastLobby(room);
      callback?.({
        ok: true,
        room: {
          code: room.code,
          mode: room.mode,
          modeLabel: room.config.label,
          hasPool: room.config.hasPool,
          players: room.players,
          started: room.started,
          maxPlayers: room.config.totalPlayers
        }
      });
    });

    socket.on('room:leave', ({ code }) => {
      socket.leave(code);
      roomManager.leaveRoom(code, socket.userId);
    });

    socket.on('room:start', async ({ code }, callback) => {
      const result = roomManager.startGame(code);
      if (result.error) return callback?.({ ok: false, error: result.error });
      const room = result.room;
      roomManager.broadcastLobby(room);
      roomManager.broadcastState(room);
      callback?.({ ok: true });
      await roomManager.playBotTurns(room);
    });

    socket.on('game:play', async ({ code, tileIndex, side }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      const result = room.game.playTile(socket.userId, tileIndex, side);
      if (!result.ok) return callback?.(result);
      roomManager.broadcastState(room);
      callback?.(result);
      if (room.game.status === 'playing') {
        await roomManager.playBotTurns(room);
      }
    });

    socket.on('game:draw', async ({ code }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      const result = room.game.drawFromPool(socket.userId);
      if (!result.ok) return callback?.(result);
      roomManager.broadcastState(room);
      callback?.(result);
    });

    socket.on('game:pass', async ({ code }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      const result = room.game.pass(socket.userId);
      if (!result.ok) return callback?.(result);
      roomManager.broadcastState(room);
      callback?.(result);
      if (room.game.status === 'playing') {
        await roomManager.playBotTurns(room);
      }
    });

    socket.on('game:next-round', async ({ code }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      const ok = room.game.startNextRound();
      if (!ok) return callback?.({ ok: false, error: 'No se puede iniciar' });
      roomManager.broadcastState(room);
      callback?.({ ok: true });
      await roomManager.playBotTurns(room);
    });

    socket.on('disconnect', () => {
      console.log(`👋 ${socket.username} desconectado`);
    });
  });
}
