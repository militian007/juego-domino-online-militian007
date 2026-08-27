import { io } from 'socket.io-client';

const URL = process.env.E2E_URL || 'http://localhost:4000';
const MODE = process.env.E2E_MODE || '1v1bot';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const socket = io(URL, { transports: ['websocket'] });

let latest = null;
let code = null;
let plays = 0;
let draws = 0;
let passes = 0;
let rounds = 0;

socket.on('game:state', (state) => {
  latest = state;
});

function assertNoDuplicates(state) {
  const seen = new Set();
  for (const t of [...state.myHand, ...state.board.map((b) => b.tile)]) {
    const k = t[0] <= t[1] ? `${t[0]}-${t[1]}` : `${t[1]}-${t[0]}`;
    if (seen.has(k)) throw new Error('FICHA DUPLICADA en el estado: ' + k);
    seen.add(k);
  }
  for (const t of state.board) {
    if (t.x < 0 || t.x > 19 || t.y < 0 || t.y > 19) {
      throw new Error('ficha fuera del grid: ' + JSON.stringify(t));
    }
  }
}

const emit = (event, payload) => new Promise((res) => socket.emit(event, payload, res));

async function run() {
  const created = await emit('room:create', { mode: MODE });
  if (!created.ok) throw new Error('room:create fallo: ' + created.error);
  code = created.code;
  log(`sala ${code} — modo ${MODE}`);

  const started = await emit('room:start', { code });
  if (!started.ok) throw new Error('room:start fallo: ' + started.error);

  const deadline = Date.now() + 180000;
  let idleTicks = 0;

  while (Date.now() < deadline) {
    const state = latest;
    if (!state) {
      await sleep(20);
      continue;
    }

    assertNoDuplicates(state);

    if (state.status === 'game-over') {
      log(`\nPARTIDA TERMINADA — gana equipo ${state.winningTeam}`);
      log(`marcador ${JSON.stringify(state.teamScores)} | rondas ${rounds} | jugadas ${plays} | robos ${draws} | pases ${passes}`);
      return true;
    }

    if (state.status === 'round-end') {
      rounds += 1;
      log(`ronda ${state.round} cerrada por "${state.endReason}" — equipo ${state.winningTeam} +${state.roundPoints} | ${JSON.stringify(state.teamScores)}`);
      latest = null;
      const r = await emit('game:next-round', { code });
      if (!r.ok) throw new Error('game:next-round fallo: ' + r.error);
      continue;
    }

    const me = state.players.find((p) => !p.isBot);
    if (state.currentPlayerId !== me.id) {
      idleTicks += 1;
      if (idleTicks > 1500) throw new Error('el bot dejo de jugar (turno colgado)');
      await sleep(20);
      continue;
    }
    idleTicks = 0;

    if (state.canPlay) {
      const mv = state.validMoves[Math.floor(Math.random() * state.validMoves.length)];
      latest = null;
      const r = await emit('game:play', { code, tileIndex: mv.index, side: mv.side });
      if (!r.ok) throw new Error('game:play fallo: ' + r.error);
      plays += 1;
    } else if (state.canDraw) {
      latest = null;
      // elegir una posicion cualquiera del pozo, como haria un jugador
      const poolIndex = Math.floor(Math.random() * state.poolCount);
      const r = await emit('game:draw', { code, poolIndex });
      if (!r.ok) throw new Error('game:draw fallo: ' + r.error);
      draws += 1;
    } else if (state.canPass) {
      latest = null;
      const r = await emit('game:pass', { code });
      if (!r.ok) throw new Error('game:pass fallo: ' + r.error);
      passes += 1;
    } else {
      throw new Error('estado sin accion posible: ' + JSON.stringify(state.validMoves));
    }
  }

  throw new Error('TIMEOUT: la partida no termino a tiempo');
}

socket.on('connect', () => {
  log('conectado como invitado', socket.id);
  run()
    .then(() => {
      socket.close();
      process.exit(0);
    })
    .catch((e) => {
      console.error('FALLO E2E:', e.message);
      socket.close();
      process.exit(1);
    });
});

socket.on('connect_error', (e) => {
  console.error('connect_error', e.message);
  process.exit(1);
});
