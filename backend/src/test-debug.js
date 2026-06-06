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

(async () => {
  console.log('TEST 1v1bot: solo flujo básico');
  const host = await connectAs('user-1v1x', 'Humano');
  console.log('  conectado');

  let stateCount = 0;
  host.on('game:state', (s) => {
    stateCount++;
    console.log(`  estado #${stateCount}: ronda=${s.round}, hand=${s.myHand.length}, pool=${s.poolCount}, current=${s.players.find(p => p.id === s.currentPlayerId)?.username}, status=${s.status}`);
  });

  const room = await new Promise((resolve) => {
    host.emit('room:create', { mode: '1v1bot' }, resolve);
  });
  console.log(`  sala creada: ${room.code}`);

  await new Promise((resolve) => {
    host.emit('room:start', { code: room.code }, resolve);
  });
  console.log('  partida iniciada');

  await wait(3000);
  console.log(`  estados recibidos en 3s: ${stateCount}`);

  host.disconnect();
  console.log('  desconectado');
  process.exit(0);
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
