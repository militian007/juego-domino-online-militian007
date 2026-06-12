import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const GUEST_NAME = 'Invitado';

export function setupGameSocket(io, roomManager) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.userId = `guest-${socket.id}`;
      socket.username = GUEST_NAME;
      socket.isGuest = true;
      return next();
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      socket.isGuest = false;
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
    const tag = socket.isGuest ? 'invitado' : 'usuario';
    console.log(`🎮 ${socket.username} (${tag}) conectado (${socket.id})`);

    socket.on('room:create', ({ mode }, callback) => {
      if (socket.isGuest && mode !== '1v1bot') {
        return callback?.({ ok: false, error: 'Necesitas registrarte para jugar en línea' });
      }
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
      if (socket.isGuest) {
        return callback?.({ ok: false, error: 'Necesitas registrarte para unirte a una partida' });
      }
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

      // Si la partida ya comenzó, enviarle el estado actual del juego de inmediato
      if (room.started && room.game) {
        const state = room.game.getStateForPlayer(socket.userId);
        state.boardShape = room.boardShape;
        socket.emit('game:state', state);
      }

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

    socket.on('matchmaking:join', ({ mode }, callback) => {
      if (socket.isGuest) {
        return callback?.({ ok: false, error: 'Necesitas registrarte para jugar en línea' });
      }
      try {
        roomManager.addToMatchmaking(socket, mode);
        callback?.({ ok: true });
      } catch (e) {
        callback?.({ ok: false, error: e.message });
      }
    });

    socket.on('matchmaking:leave', (callback) => {
      roomManager.removeFromMatchmaking(socket.id);
      callback?.({ ok: true });
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

    socket.on('game:play', async ({ code, tileIndex, side, x, y, x2, y2, orientation }, callback) => {
      const room = roomManager.rooms.get(code);
      if (!room?.game) return callback?.({ ok: false, error: 'No hay juego' });
      
      // Delay human move so it doesn't appear too instantly
      await roomManager._sleep(1000);
      
      // Re-verify that the room and game are still active after the sleep
      const activeRoom = roomManager.rooms.get(code);
      if (!activeRoom?.game) return callback?.({ ok: false, error: 'No hay juego' });
      
      const result = activeRoom.game.playTile(socket.userId, tileIndex, side, x, y, x2, y2, orientation);
      if (!result.ok) return callback?.(result);
      roomManager.broadcastState(activeRoom);
      callback?.(result);
      if (activeRoom.game.status === 'playing') {
        await roomManager.playBotTurns(activeRoom);
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

    socket.on('game:reaction', ({ code, emoji }) => {
      const room = roomManager.rooms.get(code);
      if (!room) return;
      io.to(code).emit('game:reaction', {
        playerId: socket.userId,
        username: socket.username,
        emoji
      });
    });

    socket.on('disconnect', () => {
      console.log(`👋 ${socket.username} desconectado`);
      roomManager.removeFromMatchmaking(socket.id);
    });
  });
}
