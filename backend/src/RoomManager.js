import { DominoGame } from './game/DominoGame.js';
import { Bot } from './game/Bot.js';
import { MODE_CONFIG } from './game/DominoGame.js';

const MODES = MODE_CONFIG;

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.io = null;
    this.matchmakingQueue = [];
  }

  setIO(io) {
    this.io = io;
  }

  generateCode() {
    let code;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom({ mode, hostId, hostUsername }) {
    const code = this.generateCode();
    const config = MODES[mode];
    if (!config) throw new Error('Modo inválido');

    const room = {
      code,
      mode,
      config,
      players: [
        { id: hostId, username: hostUsername, isBot: false, socketId: null }
      ],
      game: null,
      started: false
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code, { userId, username, socketId }) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };

    const existingPlayer = room.players.find((p) => p.id === userId);
    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      return { room, reconnected: true };
    }

    if (room.started) return { error: 'La partida ya comenzó' };
    if (room.players.length >= room.config.totalPlayers)
      return { error: 'Sala llena' };

    room.players.push({
      id: userId,
      username,
      isBot: false,
      socketId
    });
    return { room };
  }

  addToMatchmaking(socket, mode) {
    if (socket.isGuest) {
      throw new Error('Necesitas registrarte para jugar en línea');
    }
    // Evitar duplicados en la cola
    this.removeFromMatchmaking(socket.id);
    
    this.matchmakingQueue.push({
      socket,
      userId: socket.userId,
      username: socket.username,
      mode
    });

    console.log(`🔍 [Matchmaking] ${socket.username} se unió a la cola para ${mode}. Cola: ${this.matchmakingQueue.length}`);
    
    process.nextTick(() => this.processMatchmaking(mode));
  }

  removeFromMatchmaking(socketId) {
    const initialLen = this.matchmakingQueue.length;
    this.matchmakingQueue = this.matchmakingQueue.filter(p => p.socket.id !== socketId);
    if (this.matchmakingQueue.length < initialLen) {
      console.log(`🔌 [Matchmaking] Removido socket ${socketId}. Restantes: ${this.matchmakingQueue.length}`);
    }
  }

  processMatchmaking(mode) {
    const modeQueue = this.matchmakingQueue.filter(p => p.mode === mode);
    if (modeQueue.length >= 2) {
      const playerA = modeQueue[0];
      const playerB = modeQueue[1];

      this.removeFromMatchmaking(playerA.socket.id);
      this.removeFromMatchmaking(playerB.socket.id);

      console.log(`🤝 [Matchmaking] ¡Emparejando! ${playerA.username} vs ${playerB.username} para ${mode}`);

      try {
        const room = this.createRoom({
          mode,
          hostId: playerA.userId,
          hostUsername: playerA.username
        });

        const pA = room.players.find(p => p.id === playerA.userId);
        if (pA) pA.socketId = playerA.socket.id;
        playerA.socket.join(room.code);

        const joinResult = this.joinRoom(room.code, {
          userId: playerB.userId,
          username: playerB.username,
          socketId: playerB.socket.id
        });

        if (joinResult.error) {
          console.error('Error al unir al jugador B en matchmaking:', joinResult.error);
          return;
        }
        playerB.socket.join(room.code);

        const startResult = this.startGame(room.code);
        if (startResult.error) {
          console.error('Error al iniciar partida en matchmaking:', startResult.error);
          return;
        }

        this.broadcastLobby(room);
        this.broadcastState(room);

        playerA.socket.emit('matchmaking:success', { code: room.code });
        playerB.socket.emit('matchmaking:success', { code: room.code });

        console.log(`🚀 [Matchmaking] Partida iniciada en sala: ${room.code}`);
      } catch (err) {
        console.error('Error en proceso de matchmaking:', err);
      }
    }
  }

  leaveRoom(code, userId) {
    const room = this.rooms.get(code);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== userId);
    if (room.players.length === 0) {
      this.rooms.delete(code);
    }
  }

  startGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Sala no encontrada' };
    if (room.started) return { error: 'Ya comenzó' };

    if (room.mode === '1v1bot') {
      if (room.players.length !== 1) {
        return { error: 'El modo 1v1+bot solo admite 1 jugador' };
      }
      room.players.push({
        id: `bot-${room.code}-1`,
        username: 'Bot Rival',
        isBot: true,
        socketId: null
      });
    } else {
      if (room.players.length < room.config.totalPlayers) {
        return { error: `Faltan jugadores (${room.players.length}/${room.config.totalPlayers})` };
      }
    }

    const shapes = ['espiral', 'serpiente', 'bucle', 'zigzag', 'laberinto'];
    room.boardShape = shapes[Math.floor(Math.random() * shapes.length)];

    room.game = new DominoGame({
      roomCode: room.code,
      mode: room.mode,
      players: room.players
    });
    room.started = true;
    return { room };
  }

  async playBotTurns(room) {
    while (room.game.status === 'playing') {
      const current = room.game.getCurrentPlayer();
      if (!current.isBot) break;

      // Esperar antes de realizar la jugada (tiempo de "pensamiento" del bot)
      await this._sleep(3000);

      // Verificar que el juego sigue activo y sigue siendo el turno del bot después de dormir
      if (room.game.status !== 'playing' || room.game.getCurrentPlayer()?.id !== current.id) {
        break;
      }

      const validMoves = room.game.getValidMoves(current.id);
      if (validMoves.length > 0) {
        const bot = new Bot(room.game, current.id);
        const move = bot.chooseMove();
        if (move) {
          room.game.playTile(current.id, move.tileIndex, move.side);
        } else {
          room.game.pass(current.id);
        }
      } else if (room.game.hasPool && room.game.pool.length > 0) {
        const r = room.game.drawFromPool(current.id);
        if (!r.ok) {
          room.game.pass(current.id);
        }
      } else {
        room.game.pass(current.id);
      }

      this.broadcastState(room);
    }
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  broadcastState(room) {
    if (!this.io || !room.game) return;
    room.players.forEach((p) => {
      if (p.isBot || !p.socketId) return;
      const state = room.game.getStateForPlayer(p.id);
      state.boardShape = room.boardShape;
      this.io.to(p.socketId).emit('game:state', state);
    });
  }

  broadcastLobby(room) {
    if (!this.io) return;
    const lobbyState = {
      code: room.code,
      mode: room.mode,
      modeLabel: room.config.label,
      hasPool: room.config.hasPool,
      started: room.started,
      players: room.players.map((p) => ({
        id: p.id,
        username: p.username,
        isBot: p.isBot,
        isHost: p.id === room.players[0]?.id
      })),
      maxPlayers: room.config.totalPlayers
    };
    room.players.forEach((p) => {
      if (!p.isBot && p.socketId) {
        this.io.to(p.socketId).emit('lobby:update', lobbyState);
      }
    });
  }
}

export const roomManager = new RoomManager();
