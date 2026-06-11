import {
  generateAllTiles,
  shuffle,
  tilePips,
  isDouble,
  TILES_PER_PLAYER,
  WINNING_SCORE
} from './Tile.js';

export const GRID_SIZE = 80;
const CELL_SIZE = 32;

const getCenter = (t) => {
  const minX = Math.min(t.x, t.x2);
  const minY = Math.min(t.y, t.y2);
  if (t.orientation === 'horizontal') {
    return { x: minX * CELL_SIZE + 32, y: minY * CELL_SIZE + 16 };
  } else {
    return { x: minX * CELL_SIZE + 16, y: minY * CELL_SIZE + 32 };
  }
};

function computeBoardOffsets(board) {
  if (!board || board.length === 0) return [];

  const offsets = new Array(board.length);
  const firstIdx = board.findIndex(t => t.side === 'first');
  const startIdx = firstIdx !== -1 ? firstIdx : 0;

  offsets[startIdx] = { x: 0, y: 0 };

  // Propagar a la derecha
  for (let i = startIdx + 1; i < board.length; i++) {
    const prev = board[i - 1];
    const curr = board[i];
    const prevOffset = offsets[i - 1];
    const prevIsDouble = prev.tile[0] === prev.tile[1];
    const currIsDouble = curr.tile[0] === curr.tile[1];

    if (prev.orientation !== curr.orientation && (prevIsDouble || currIsDouble)) {
      const prevCenter = getCenter(prev);
      const currCenter = getCenter(curr);
      const doubleTile = currIsDouble ? curr : prev;
      if (doubleTile.orientation === 'vertical') {
        offsets[i] = {
          x: prevOffset.x,
          y: prevOffset.y + prevCenter.y - currCenter.y
        };
      } else {
        offsets[i] = {
          x: prevOffset.x + prevCenter.x - currCenter.x,
          y: prevOffset.y
        };
      }
    } else {
      offsets[i] = { x: prevOffset.x, y: prevOffset.y };
    }
  }

  // Propagar a la izquierda
  for (let i = startIdx - 1; i >= 0; i--) {
    const prev = board[i + 1];
    const curr = board[i];
    const prevOffset = offsets[i + 1];
    const prevIsDouble = prev.tile[0] === prev.tile[1];
    const currIsDouble = curr.tile[0] === curr.tile[1];

    if (prev.orientation !== curr.orientation && (prevIsDouble || currIsDouble)) {
      const prevCenter = getCenter(prev);
      const currCenter = getCenter(curr);
      const doubleTile = currIsDouble ? curr : prev;
      if (doubleTile.orientation === 'vertical') {
        offsets[i] = {
          x: prevOffset.x,
          y: prevOffset.y + prevCenter.y - currCenter.y
        };
      } else {
        offsets[i] = {
          x: prevOffset.x + prevCenter.x - currCenter.x,
          y: prevOffset.y
        };
      }
    } else {
      offsets[i] = { x: prevOffset.x, y: prevOffset.y };
    }
  }

  return offsets;
}


export const MODE_CONFIG = {
  '1v1': { humans: 2, bots: 0, totalPlayers: 2, teams: false, hasPool: true, label: '1 vs 1' },
  '1v1bot': { humans: 1, bots: 1, totalPlayers: 2, teams: false, hasPool: true, label: '1 vs 1 (con bot)' },
  '2v2': { humans: 4, bots: 0, totalPlayers: 4, teams: true, hasPool: false, label: '2 vs 2' }
};

export class DominoGame {
  constructor({ roomCode, mode, players }) {
    this.roomCode = roomCode;
    this.mode = mode;
    this.config = MODE_CONFIG[mode];
    if (!this.config) throw new Error('Modo inválido');
    this.players = players;
    this.hands = {};
    this.board = [];
    this.ends = null;
    this.currentPlayerIndex = 0;
    this.passes = 0;
    this.round = 1;
    this.teamScores = { 1: 0, 2: 0 };
    this.roundStarterIndex = 0;
    this.winner = null;
    this.winningTeam = null;
    this.endReason = null;
    this.lastAction = null;
    this.status = 'playing';
    this.pool = [];
    this.drawsThisTurn = 0;

    this._buildTeams();
    this._deal();
    this._determineStarter();
    this._setupBots();
  }

  get numPlayers() {
    return this.players.length;
  }

  get hasPool() {
    return this.config.hasPool;
  }

  _buildTeams() {
    if (this.config.teams) {
      this.players.forEach((p, i) => {
        p.team = i % 2 === 0 ? 1 : 2;
        p.seat = i;
      });
    } else {
      this.players[0].team = 1;
      this.players[0].seat = 0;
      for (let i = 1; i < this.players.length; i++) {
        this.players[i].team = 2;
        this.players[i].seat = i;
      }
    }
  }

  _deal() {
    const tiles = shuffle(generateAllTiles());
    const numPlayers = this.players.length;
    const perPlayer = TILES_PER_PLAYER;
    this.players.forEach((p, i) => {
      this.hands[p.id] = tiles
        .slice(i * perPlayer, (i + 1) * perPlayer)
        .map((t) => (t[0] <= t[1] ? t : [t[1], t[0]]));
    });
    if (this.config.hasPool) {
      this.pool = tiles
        .slice(numPlayers * perPlayer)
        .map((t) => (t[0] <= t[1] ? t : [t[1], t[0]]));
    } else {
      this.pool = [];
    }
  }

  _determineStarter() {
    let highestDouble = -1;
    let highestPip = -1;
    let starterIndex = 0;

    this.players.forEach((p, idx) => {
      for (const tile of this.hands[p.id]) {
        if (isDouble(tile) && tile[0] > highestDouble) {
          highestDouble = tile[0];
          starterIndex = idx;
        }
      }
    });

    if (highestDouble === -1) {
      this.players.forEach((p, idx) => {
        for (const tile of this.hands[p.id]) {
          if (tilePips(tile) > highestPip) {
            highestPip = tilePips(tile);
            starterIndex = idx;
          }
        }
      });
    }

    this.currentPlayerIndex = starterIndex;
    this.roundStarterIndex = starterIndex;
  }

  _setupBots() {
    this.bots = {};
    this.players.forEach((p) => {
      if (p.isBot) {
        this.bots[p.id] = {
          memory: { playedTiles: [], remainingByNumber: this._initialCount() }
        };
      }
    });
  }

  _initialCount() {
    const counts = {};
    for (let i = 0; i <= 6; i++) counts[i] = 7;
    return counts;
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getValidMoves(playerId) {
    const hand = this.hands[playerId];
    if (!hand || hand.length === 0) return [];

    if (!this.ends) {
      return hand.map((tile, index) => ({
        tile,
        index,
        side: 'first',
        handAfter: hand.filter((_, i) => i !== index)
      }));
    }

    const moves = [];
    hand.forEach((tile, index) => {
      if (tile[0] === this.ends.left || tile[1] === this.ends.left) {
        moves.push({
          tile,
          index,
          side: 'left',
          handAfter: hand.filter((_, i) => i !== index)
        });
      }
      if (tile[0] === this.ends.right || tile[1] === this.ends.right) {
        moves.push({
          tile,
          index,
          side: 'right',
          handAfter: hand.filter((_, i) => i !== index)
        });
      }
    });

    const seen = new Set();
    return moves.filter((m) => {
      const k = `${m.tile[0]}-${m.tile[1]}-${m.side}-${m.index}`;
      if (seen.has(k)) return false;
      seen.add(k);
      const placements = this.getValidPlacementsForTile(m.tile, m.side);
      return placements.length > 0;
    });
  }

  getValidPlacementsForTile(tile, side) {
    const placements = [];

    // Si el tablero está vacío
    if (this.board.length === 0) {
      if (side !== 'first') return [];
      const cx = Math.floor(GRID_SIZE / 2);
      const cy = Math.floor(GRID_SIZE / 2);

      // Opción 1: Horizontal
      placements.push({
        tile: [tile[0], tile[1]],
        x: cx,
        y: cy,
        x2: cx + 1,
        y2: cy,
        orientation: 'horizontal',
        side: 'first'
      });

      // Opción 2: Vertical
      placements.push({
        tile: [tile[0], tile[1]],
        x: cx,
        y: cy,
        x2: cx,
        y2: cy + 1,
        orientation: 'vertical',
        side: 'first'
      });

      return placements;
    }

    // Obtener celda del extremo correspondiente
    let ex = 0;
    let ey = 0;
    let ev = 0;
    let endTile = null;

    if (side === 'left') {
      endTile = this.board[0];
      ex = endTile.x;
      ey = endTile.y;
      ev = endTile.tile[0];
    } else if (side === 'right') {
      endTile = this.board[this.board.length - 1];
      ex = endTile.x2;
      ey = endTile.y2;
      ev = endTile.tile[1];
    } else {
      return [];
    }

    // Validar que la ficha encaje con el valor del extremo
    if (tile[0] !== ev && tile[1] !== ev) return [];

    const connVal = ev;
    const outerVal = (tile[0] === ev) ? tile[1] : tile[0];

    // Recopilar todas las celdas ocupadas
    const occupied = new Set();
    for (const t of this.board) {
      occupied.add(`${t.x},${t.y}`);
      occupied.add(`${t.x2},${t.y2}`);
    }

    const endIsDouble = endTile.tile[0] === endTile.tile[1];
    const boardOffsets = computeBoardOffsets(this.board);

    // Función auxiliar para agregar placement si es válido
    const addPlacementCandidate = (p) => {
      const minX = Math.min(p.x, p.x2);
      const minY = Math.min(p.y, p.y2);
      const maxX = Math.max(p.x, p.x2);
      const maxY = Math.max(p.y, p.y2);

      // 1. Grid boundary check
      if (minX < 0 || maxX >= GRID_SIZE || minY < 0 || maxY >= GRID_SIZE) return;
      // 2. Collision check
      if (occupied.has(`${p.x},${p.y}`) || occupied.has(`${p.x2},${p.y2}`)) return;

      // 3. Visual boundary check (taking propagation offsets into account)
      let offset = { x: 0, y: 0 };
      if (this.board && this.board.length > 0) {
        let prev, prevOffset;
        if (p.side === 'left') {
          prev = this.board[0];
          prevOffset = boardOffsets[0] || { x: 0, y: 0 };
        } else {
          prev = this.board[this.board.length - 1];
          prevOffset = boardOffsets[this.board.length - 1] || { x: 0, y: 0 };
        }

        const prevIsDouble = prev.tile[0] === prev.tile[1];
        const optIsDouble = p.tile[0] === p.tile[1];

        if (prev.orientation !== p.orientation && (prevIsDouble || optIsDouble)) {
          const prevCenter = getCenter(prev);
          const optCenter = getCenter(p);
          const doubleTile = optIsDouble ? p : prev;
          if (doubleTile.orientation === 'vertical') {
            offset = {
              x: prevOffset.x,
              y: prevOffset.y + prevCenter.y - optCenter.y
            };
          } else {
            offset = {
              x: prevOffset.x + prevCenter.x - optCenter.x,
              y: prevOffset.y
            };
          }
        } else {
          offset = { x: prevOffset.x, y: prevOffset.y };
        }
      }

      const tileWidth = p.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
      const tileHeight = p.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;
      const left = minX * CELL_SIZE + offset.x;
      const top = minY * CELL_SIZE + offset.y;

      // 3. Visual boundary check
      if (left < 0 || (left + tileWidth) > (GRID_SIZE * CELL_SIZE) || top < 0 || (top + tileHeight) > (GRID_SIZE * CELL_SIZE)) {
        return; // Rejects placements that would render outside the visual board area
      }

      // 4. Visual collision check with all existing tiles on the board
      if (this.board && this.board.length > 0) {
        const pRect = {
          left: left,
          top: top,
          width: tileWidth,
          height: tileHeight
        };

        for (let idx = 0; idx < this.board.length; idx++) {
          const t = this.board[idx];
          const tOffset = boardOffsets[idx] || { x: 0, y: 0 };
          const tMinX = Math.min(t.x, t.x2);
          const tMinY = Math.min(t.y, t.y2);
          const tWidth = t.orientation === 'horizontal' ? CELL_SIZE * 2 : CELL_SIZE;
          const tHeight = t.orientation === 'horizontal' ? CELL_SIZE : CELL_SIZE * 2;
          const tRect = {
            left: tMinX * CELL_SIZE + tOffset.x,
            top: tMinY * CELL_SIZE + tOffset.y,
            width: tWidth,
            height: tHeight
          };

          // Strict inequality so touching edges are not counted as overlapping
          const overlaps = (
            pRect.left < tRect.left + tRect.width &&
            pRect.left + pRect.width > tRect.left &&
            pRect.top < tRect.top + tRect.height &&
            pRect.top + pRect.height > tRect.top
          );

          if (overlaps) {
            return; // Rejects placements that visually overlap with any existing tile
          }
        }
      }

      placements.push(p);
    };

    if (endIsDouble) {
      // Si el extremo es un DOBLE, la nueva ficha debe colocarse perpendicular
      if (endTile.orientation === 'horizontal') {
        // Doble horizontal: nueva ficha es vertical (arriba para left, abajo para right)
        // Usar Math.min(endTile.x, endTile.x2) para que ambas opciones (Arriba y Abajo) estén en la misma columna (alineadas al medio)
        const minX = Math.min(endTile.x, endTile.x2);
        if (side === 'left') {
          // Opción Arriba
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: minX,
            y: ey - 2,
            x2: minX,
            y2: ey - 1,
            orientation: 'vertical',
            side
          });
        } else {
          // Opción Abajo
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: minX,
            y: ey + 1,
            x2: minX,
            y2: ey + 2,
            orientation: 'vertical',
            side
          });
        }
      } else {
        // Doble vertical: nueva ficha es horizontal (izquierda para left, derecha para right)
        // Usar Math.min(endTile.y, endTile.y2) para que ambas opciones (Izquierda y Derecha) estén en la misma fila (alineadas al medio)
        const minY = Math.min(endTile.y, endTile.y2);
        if (side === 'left') {
          // Opción Izquierda
          addPlacementCandidate({
            tile: [outerVal, connVal],
            x: ex - 2,
            y: minY,
            x2: ex - 1,
            y2: minY,
            orientation: 'horizontal',
            side
          });
        } else {
          // Opción Derecha
          addPlacementCandidate({
            tile: [connVal, outerVal],
            x: ex + 1,
            y: minY,
            x2: ex + 2,
            y2: minY,
            orientation: 'horizontal',
            side
          });
        }
      }
    } else {
      // El extremo es una ficha NORMAL.
      const tileIsDouble = tile[0] === tile[1];
      if (tileIsDouble) {
        // La nueva ficha es un DOBLE: se coloca perpendicular, centrada en el extremo
        if (endTile.orientation === 'horizontal') {
          // El doble debe ser vertical
          if (side === 'left') {
            addPlacementCandidate({
              tile: [connVal, connVal],
              x: ex - 1,
              y: ey - 1,
              x2: ex - 1,
              y2: ey,
              orientation: 'vertical',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, connVal],
              x: ex + 1,
              y: ey,
              x2: ex + 1,
              y2: ey - 1,
              orientation: 'vertical',
              side
            });
          }
        } else {
          // El doble debe ser horizontal
          if (side === 'left') {
            addPlacementCandidate({
              tile: [connVal, connVal],
              x: ex - 1,
              y: ey - 1,
              x2: ex,
              y2: ey - 1,
              orientation: 'horizontal',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, connVal],
              x: ex - 1,
              y: ey + 1,
              x2: ex,
              y2: ey + 1,
              orientation: 'horizontal',
              side
            });
          }
        }
      } else {
        // La nueva ficha es NORMAL (no es doble). Puede colocarse en 3 direcciones:
        if (endTile.orientation === 'horizontal') {
          // 1. Recto (horizontal)
          if (side === 'left') {
            addPlacementCandidate({
              tile: [outerVal, connVal],
              x: ex - 2,
              y: ey,
              x2: ex - 1,
              y2: ey,
              orientation: 'horizontal',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, outerVal],
              x: ex + 1,
              y: ey,
              x2: ex + 2,
              y2: ey,
              orientation: 'horizontal',
              side
            });
          }

          // 2. Giro arriba (vertical)
          if (side === 'left') {
            addPlacementCandidate({
              tile: [outerVal, connVal],
              x: ex,
              y: ey - 2,
              x2: ex,
              y2: ey - 1,
              orientation: 'vertical',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, outerVal],
              x: ex,
              y: ey - 1,
              x2: ex,
              y2: ey - 2,
              orientation: 'vertical',
              side
            });
          }

          // 3. Giro abajo (vertical)
          if (side === 'left') {
            addPlacementCandidate({
              tile: [outerVal, connVal],
              x: ex,
              y: ey + 2,
              x2: ex,
              y2: ey + 1,
              orientation: 'vertical',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, outerVal],
              x: ex,
              y: ey + 1,
              x2: ex,
              y2: ey + 2,
              orientation: 'vertical',
              side
            });
          }
        } else {
          // El extremo es vertical
          // 1. Recto (vertical)
          if (side === 'left') {
            addPlacementCandidate({
              tile: [outerVal, connVal],
              x: ex,
              y: ey - 2,
              x2: ex,
              y2: ey - 1,
              orientation: 'vertical',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, outerVal],
              x: ex,
              y: ey + 1,
              x2: ex,
              y2: ey + 2,
              orientation: 'vertical',
              side
            });
          }

          // 2. Giro izquierda (horizontal)
          if (side === 'left') {
            addPlacementCandidate({
              tile: [outerVal, connVal],
              x: ex - 2,
              y: ey,
              x2: ex - 1,
              y2: ey,
              orientation: 'horizontal',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, outerVal],
              x: ex - 1,
              y: ey,
              x2: ex - 2,
              y2: ey,
              orientation: 'horizontal',
              side
            });
          }

          // 3. Giro derecha (horizontal)
          if (side === 'left') {
            addPlacementCandidate({
              tile: [outerVal, connVal],
              x: ex + 2,
              y: ey,
              x2: ex + 1,
              y2: ey,
              orientation: 'horizontal',
              side
            });
          } else {
            addPlacementCandidate({
              tile: [connVal, outerVal],
              x: ex + 1,
              y: ey,
              x2: ex + 2,
              y2: ey,
              orientation: 'horizontal',
              side
            });
          }
        }
      }
    }

    // Deduplicar posiciones físicas idénticas (para fichas dobles)
    const seen = new Set();
    const uniquePlacements = [];
    for (const p of placements) {
      const minX = Math.min(p.x, p.x2);
      const minY = Math.min(p.y, p.y2);
      const key = `${minX},${minY},${p.orientation}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePlacements.push(p);
      }
    }

    return uniquePlacements;
  }

  chooseBotPlacement(placements, side) {
    if (!placements || placements.length === 0) return null;

    // Si hay suficientes fichas en el tablero, intentar continuar en línea recta
    if (this.board.length >= 1) {
      const endTile = (side === 'left') ? this.board[0] : this.board[this.board.length - 1];
      let dx = 0, dy = 0;
      if (side === 'left') {
        dx = endTile.x - endTile.x2;
        dy = endTile.y - endTile.y2;
      } else {
        dx = endTile.x2 - endTile.x;
        dy = endTile.y2 - endTile.y;
      }

      // Coordenadas objetivo en línea recta
      const ex = (side === 'left') ? endTile.x : endTile.x2;
      const ey = (side === 'left') ? endTile.y : endTile.y2;
      const targetCx = ex + dx;
      const targetCy = ey + dy;
      const targetCx2 = targetCx + dx;
      const targetCy2 = targetCy + dy;

      const straightOpt = placements.find(p => 
        (side === 'left' 
          ? (p.x === targetCx2 && p.y === targetCy2 && p.x2 === targetCx && p.y2 === targetCy)
          : (p.x === targetCx && p.y === targetCy && p.x2 === targetCx2 && p.y2 === targetCy2))
      );
      if (straightOpt) return straightOpt;
    }

    // Si no es posible ir recto (o es la primera ficha), elegir la primera opción
    return placements[0];
  }

  playTile(playerId, tileIndex, side = null, x = null, y = null, x2 = null, y2 = null, orientation = null) {
    if (this.status !== 'playing') {
      return { ok: false, error: 'La partida no está activa' };
    }
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) {
      return { ok: false, error: 'No es tu turno' };
    }
    const moves = this.getValidMoves(playerId);
    if (moves.length === 0) {
      return { ok: false, error: this.hasPool && this.pool.length > 0
        ? 'Debes robar del pozo'
        : 'No tienes jugadas válidas, debes pasar' };
    }
    let move;
    if (side) {
      move = moves.find((m) => m.index === tileIndex && m.side === side);
    } else {
      move = moves.find((m) => m.index === tileIndex);
    }
    if (!move) {
      return { ok: false, error: 'Jugada inválida' };
    }

    const tile = move.tile;
    const placements = this.getValidPlacementsForTile(tile, move.side);
    if (placements.length === 0) {
      return { ok: false, error: 'La colocación física de la ficha está bloqueada' };
    }

    let px = x;
    let py = y;
    let px2 = x2;
    let py2 = y2;
    let porient = orientation;

    if (px === null || py === null) {
      const chosen = this.chooseBotPlacement(placements, move.side);
      px = chosen.x;
      py = chosen.y;
      px2 = chosen.x2;
      py2 = chosen.y2;
      porient = chosen.orientation;
    } else {
      const isValidCoord = placements.some(p => 
        p.x === px && p.y === py && p.x2 === px2 && p.y2 === py2 && p.orientation === porient
      );
      if (!isValidCoord) {
        return { ok: false, error: 'Coordenadas de colocación inválidas o colisión en la cuadrícula' };
      }
    }

    const hand = this.hands[playerId];
    this.hands[playerId] = hand.filter((_, i) => i !== tileIndex);

    const chosenPlacement = placements.find(p => p.x === px && p.y === py && p.x2 === px2 && p.y2 === py2);
    const finalTile = chosenPlacement ? chosenPlacement.tile : tile;

    this._placeTile(finalTile, move.side, px, py, px2, py2, porient);
    this.passes = 0;
    this.drawsThisTurn = 0;
    this.lastAction = { type: 'play', playerId, tile: finalTile };

    if (this.bots[playerId]) {
      this._recordPlayedTile(finalTile);
    }

    if (this.hands[playerId].length === 0) {
      this._endRound('domino', playerId);
      return { ok: true };
    }

    this._advanceTurn();
    return { ok: true };
  }

  drawFromPool(playerId) {
    if (!this.hasPool) {
      return { ok: false, error: 'Esta modalidad no tiene pozo' };
    }
    if (this.status !== 'playing') {
      return { ok: false, error: 'La partida no está activa' };
    }
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) {
      return { ok: false, error: 'No es tu turno' };
    }
    if (this.getValidMoves(playerId).length > 0) {
      return { ok: false, error: 'Tienes jugadas disponibles, no puedes robar' };
    }
    if (this.pool.length === 0) {
      return { ok: false, error: 'El pozo está vacío' };
    }

    const tile = this.pool.pop();
    const hand = this.hands[playerId];
    hand.push(tile[0] <= tile[1] ? tile : [tile[1], tile[0]]);
    this.drawsThisTurn++;
    this.lastAction = { type: 'draw', playerId, tile };
    return { ok: true, tile: hand[hand.length - 1] };
  }

  pass(playerId) {
    if (this.status !== 'playing') {
      return { ok: false, error: 'La partida no está activa' };
    }
    const current = this.getCurrentPlayer();
    if (current.id !== playerId) {
      return { ok: false, error: 'No es tu turno' };
    }
    const moves = this.getValidMoves(playerId);
    if (moves.length > 0) {
      return { ok: false, error: 'Tienes jugadas disponibles, no puedes pasar' };
    }
    if (this.hasPool && this.pool.length > 0) {
      return { ok: false, error: 'Aún hay fichas en el pozo, debes robar' };
    }

    this.passes++;
    this.drawsThisTurn = 0;
    this.lastAction = { type: 'pass', playerId };

    if (this.passes >= this.players.length) {
      this._endRound('blocked', null);
      return { ok: true, blocked: true };
    }

    this._advanceTurn();
    return { ok: true };
  }

  _placeTile(tile, side, x, y, x2, y2, orientation) {
    const placedItem = { tile, side, x, y, x2, y2, orientation };
    if (side === 'left') {
      this.board.unshift(placedItem);
      this.ends.left = tile[0];
    } else {
      this.board.push(placedItem);
      if (side === 'first') {
        this.ends = { left: tile[0], right: tile[1] };
      } else {
        this.ends.right = tile[1];
      }
    }
  }

  _recordPlayedTile(tile) {
    this.players.forEach((p) => {
      if (this.bots[p.id]) {
        const m = this.bots[p.id].memory;
        m.playedTiles.push(tile[0] <= tile[1] ? tile : [tile[1], tile[0]]);
        m.remainingByNumber[tile[0]]--;
        m.remainingByNumber[tile[1]]--;
      }
    });
  }

  _advanceTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  _endRound(reason, winnerId) {
    this.status = 'round-end';
    this.endReason = reason;
    if (reason === 'domino') {
      this.winner = winnerId;
      const winnerPlayer = this.players.find((p) => p.id === winnerId);
      this.winningTeam = winnerPlayer.team;
      const totalPips = this.players.reduce(
        (sum, p) => sum + this.hands[p.id].reduce((s, t) => s + tilePips(t), 0),
        0
      );
      this.roundPoints = totalPips;
      this.teamScores[this.winningTeam] += totalPips;
    } else if (reason === 'blocked') {
      const teamPips = { 1: 0, 2: 0 };
      this.players.forEach((p) => {
        teamPips[p.team] += this.hands[p.id].reduce(
          (s, t) => s + tilePips(t),
          0
        );
      });
      if (teamPips[1] < teamPips[2]) {
        this.winningTeam = 1;
        this.roundPoints = teamPips[2] - teamPips[1];
      } else if (teamPips[2] < teamPips[1]) {
        this.winningTeam = 2;
        this.roundPoints = teamPips[1] - teamPips[2];
      } else {
        this.winningTeam = 0;
        this.roundPoints = 0;
      }
      if (this.winningTeam !== 0) {
        this.teamScores[this.winningTeam] += this.roundPoints;
      }
    }

    if (this.teamScores[1] >= WINNING_SCORE || this.teamScores[2] >= WINNING_SCORE) {
      this.status = 'game-over';
    }
  }

  startNextRound() {
    if (this.status !== 'round-end') return false;
    this.board = [];
    this.ends = null;
    this.passes = 0;
    this.lastAction = null;
    this.endReason = null;
    this.winner = null;
    this.winningTeam = null;
    this.drawsThisTurn = 0;

    this._deal();
    this._setupBots();

    if (this.winningTeam && this.winningTeam !== 0) {
      const winningPlayerIdx = this.players.findIndex(
        (p) => p.team === this.winningTeam
      );
      this.currentPlayerIndex = winningPlayerIdx;
      this.roundStarterIndex = winningPlayerIdx;
    } else {
      this._determineStarter();
    }

    this.status = 'playing';
    return true;
  }

  getStateForPlayer(playerId) {
    const validMoves = this.getValidMoves(playerId);
    return {
      roomCode: this.roomCode,
      mode: this.mode,
      hasPool: this.hasPool,
      poolCount: this.pool.length,
      status: this.status,
      round: this.round,
      teamScores: this.teamScores,
      winningTeam: this.winningTeam,
      roundPoints: this.roundPoints,
      endReason: this.endReason,
      lastAction: this.lastAction,
      currentPlayerId: this.getCurrentPlayer()?.id,
      board: this.board,
      ends: this.ends,
      myHand: this.hands[playerId] || [],
      handCounts: this.players.reduce((acc, p) => {
        acc[p.id] = (this.hands[p.id] || []).length;
        return acc;
      }, {}),
      players: this.players.map((p) => ({
        id: p.id,
        username: p.username,
        isBot: p.isBot,
        team: p.team,
        seat: p.seat
      })),
      validMoves: validMoves.map((m) => ({
        index: m.index,
        tile: m.tile,
        side: m.side
      })),
      canPlay: validMoves.length > 0,
      canDraw: this.hasPool && validMoves.length === 0 && this.pool.length > 0,
      canPass: validMoves.length === 0 && (!this.hasPool || this.pool.length === 0)
    };
  }
}
