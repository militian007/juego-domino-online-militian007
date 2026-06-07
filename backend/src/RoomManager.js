import { DominoGame } from './game/DominoGame.js';
import { Bot } from './game/Bot.js';
import { MODE_CONFIG } from './game/DominoGame.js';

const MODES = MODE_CONFIG;

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.io = null;
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
    if (room.started) return { error: 'La partida ya comenzó' };
    if (room.players.find((p) => p.id === userId))
      return { error: 'Ya estás en la sala', room };
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

    const shapes = ['l', 'escalera', 'cuesta', 'gancho', 'serpiente'];
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
      await this._sleep(2500);
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
