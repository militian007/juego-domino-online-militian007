import jwt from 'jsonwebtoken';
import { io as ioClient } from 'socket.io-client';

const JWT_SECRET = 'dev-secret-cambiar-en-produccion-123456789';
const URL = 'http://localhost:4000';

function token(userId, username) {
  return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1d' });
}

function connectAs(userId, username) {
  return new Promise((resolve, reject) => {
    const s = ioClient(URL, {
      auth: { token: token(userId, username) },
      transports: ['websocket']
    });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('timeout')), 5000);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let passed = 0, failed = 0;
const check = (c, m) => {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else { console.log(`  ✗ ${m}`); failed++; }
};

async function test1v1bot_basic() {
  console.log('TEST 1v1+bot: crear, iniciar, recibir estado, humano juega una ficha');
  const host = await connectAs('user-1v1z', 'Humano');
  let currentState = null;
  host.on('game:state', (s) => { currentState = s; });

  const room = await new Promise((r) =>
    host.emit('room:create', { mode: '1v1bot' }, r)
  );
  check(room.ok, 'Sala 1v1bot creada');

  await new Promise((r) =>
    host.emit('room:start', { code: room.code }, (res) => {
      check(res.ok, 'Partida auto-iniciada');
      r();
    })
  );

  await wait(800);
  check(currentState !== null, 'Estado inicial recibido');
  if (!currentState) return host.disconnect();
  check(currentState.myHand.length === 7, 'Humano tiene 7 fichas');
  check(currentState.hasPool && currentState.poolCount === 14, 'Pozo con 14');
  check(currentState.players.length === 2, '2 jugadores');
  check(currentState.players[1].isBot, 'Jugador 2 es bot');

  if (currentState.canPlay && currentState.validMoves.length > 0) {
    const move = currentState.validMoves[0];
    const res = await new Promise((r) =>
      host.emit('game:play', { code: room.code, tileIndex: move.index, side: move.side }, r)
    );
    check(res.ok, 'Humano jugó una ficha');
  } else {
    check(false, 'Humano debería poder jugar al inicio (al menos una jugable)');
  }

  await wait(800);
  check(currentState !== null, 'Estado actualizado tras jugada');
  check(currentState.board.length >= 1, `Tablero tiene ${currentState.board.length} fichas`);

  host.disconnect();
}

async function test2v2_lobby() {
  console.log('\nTEST 2v2: lobby, unión de 3 jugadores, host inicia');
  const host = await connectAs('user-h2v2z', 'Host');
  const g1 = await connectAs('user-g1', 'G1');
  const g2 = await connectAs('user-g2', 'G2');
  const g3 = await connectAs('user-g3', 'G3');

  let lobby = null, gameH = null, gameG = null;
  host.on('lobby:update', (s) => { lobby = s; });
  host.on('game:state', (s) => { gameH = s; });
  g1.on('game:state', (s) => { gameG = s; });
  g2.on('game:state', () => {});
  g3.on('game:state', () => {});

  const room = await new Promise((r) => host.emit('room:create', { mode: '2v2' }, r));
  check(room.ok, 'Sala 2v2 creada');
  check(room.room.maxPlayers === 4, 'maxPlayers=4');
  check(room.room.hasPool === false, 'Sin pozo');

  for (const [g, name] of [[g1, 'G1'], [g2, 'G2'], [g3, 'G3']]) {
    const res = await new Promise((r) => g.emit('room:join', { code: room.code }, r));
    check(res.ok, `${name} se unió`);
    await wait(150);
  }

  check(lobby && lobby.players.length === 4, 'Lobby con 4 jugadores');

  const startRes = await new Promise((r) =>
    host.emit('room:start', { code: room.code }, r)
  );
  check(startRes.ok, 'Host inició');

  await wait(1200);
  check(gameH !== null, 'Host recibió game:state');
  check(gameG !== null, 'G1 recibió game:state');
  if (gameH) {
    check(gameH.hasPool === false, 'Sin pozo en 2v2');
    check(gameH.players.length === 4, '4 jugadores en juego');
    check(gameH.myHand.length === 7, 'Mano del host = 7');
    check(gameH.poolCount === 0, 'poolCount=0');
  }

  host.disconnect();
  g1.disconnect();
  g2.disconnect();
  g3.disconnect();
}

(async () => {
  await test1v1bot_basic();
  await test2v2_lobby();
  console.log(`\nPasados: ${passed} | Fallados: ${failed}`);
  if (failed > 0) process.exit(1);
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
