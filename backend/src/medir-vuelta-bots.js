// Cuanto espera una persona, en 2v2bots, entre su jugada y su siguiente turno.
//
// Uso:
//   node src/medir-vuelta-bots.js          -> levanta un servidor propio en :4100, mide 10 vueltas y lo apaga
//   node src/medir-vuelta-bots.js 20       -> 20 vueltas
//   E2E_URL=http://localhost:4000 node src/medir-vuelta-bots.js   -> contra un servidor ya levantado
//
// Una "vuelta" es: la persona juega (asiento 0), los tres bots piensan y juegan,
// y le vuelve a tocar. Solo cuentan las vueltas dentro de una misma ronda: si
// la ronda cierra en el medio, esa no se mide. El servidor propio usa una base
// aparte (data-prueba.db) que se borra al final.
import 'dotenv/config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

const VUELTAS = Number(process.argv[2] || 10);
const PUERTO = 4100;
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(RAIZ, 'data-prueba.db');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function levantarServidor() {
  const hijo = spawn(process.execPath, ['src/server.js'], {
    cwd: RAIZ,
    env: { ...process.env, PORT: String(PUERTO), DATABASE_PATH: BASE },
    stdio: 'ignore'
  });
  const url = `http://localhost:${PUERTO}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${url}/api/health`);
      if (r.ok) return { hijo, url };
    } catch {}
    await sleep(100);
  }
  hijo.kill();
  throw new Error('el servidor no levanto en :' + PUERTO);
}

async function registrarse(url) {
  const nombre = `medidor${Date.now().toString(36)}`;
  const r = await fetch(`${url}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: nombre, email: `${nombre}@prueba.local`, password: 'medir123' })
  });
  const cuerpo = await r.json();
  if (!r.ok) throw new Error('registro fallo: ' + cuerpo.error);
  return cuerpo.token;
}

function conectar(url, token) {
  return new Promise((resolve, reject) => {
    const s = io(url, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

async function medir(socket) {
  let ultimo = null;
  const esperando = [];
  socket.on('game:state', (estado) => {
    ultimo = estado;
    for (const w of esperando.splice(0)) w(estado);
  });
  const pedir = (evento, datos) => new Promise((res) => socket.emit(evento, datos, res));
  const esperarEstado = (condicion) =>
    new Promise((resolve) => {
      if (ultimo && condicion(ultimo)) return resolve(ultimo);
      const mirar = (e) => (condicion(e) ? resolve(e) : esperando.push(mirar));
      esperando.push(mirar);
    });

  const creada = await pedir('room:create', { mode: '2v2bots' });
  if (!creada.ok) throw new Error('room:create fallo: ' + creada.error);
  const code = creada.code;
  const empezada = await pedir('room:start', { code });
  if (!empezada.ok) throw new Error('room:start fallo: ' + empezada.error);

  const vueltas = [];
  while (vueltas.length < VUELTAS) {
    const estado = await esperarEstado((e) => e.status !== 'playing' || e.currentPlayerId === e.players[0].id);
    if (estado.status === 'game-over') break;
    if (estado.status === 'round-end') {
      ultimo = null;
      await pedir('game:next-round', { code });
      continue;
    }

    const ronda = estado.round;
    ultimo = null;
    const t0 = Date.now();
    const r = estado.canPlay
      ? await pedir('game:play', { code, tileIndex: estado.validMoves[0].index, side: estado.validMoves[0].side })
      : await pedir('game:pass', { code });
    if (!r.ok) throw new Error('la jugada fallo: ' + r.error);

    const vuelta = await esperarEstado((e) => e.status !== 'playing' || e.currentPlayerId === e.players[0].id);
    if (vuelta.status === 'playing' && vuelta.round === ronda) {
      vueltas.push(Date.now() - t0);
      console.log(`  vuelta ${vueltas.length}: ${(vueltas[vueltas.length - 1] / 1000).toFixed(2)} s`);
    }
  }

  socket.emit('room:leave', { code });
  return vueltas;
}

async function main() {
  const propio = !process.env.E2E_URL;
  const servidor = propio ? await levantarServidor() : { url: process.env.E2E_URL };
  let socket;
  try {
    const token = await registrarse(servidor.url);
    socket = await conectar(servidor.url, token);
    const vueltas = await medir(socket);
    const media = vueltas.reduce((a, b) => a + b, 0) / (vueltas.length || 1);
    console.log('');
    console.log(`  ${vueltas.length} vueltas medidas en 2v2bots contra ${servidor.url}`);
    console.log(`  media ${(media / 1000).toFixed(2)} s, minimo ${(Math.min(...vueltas) / 1000).toFixed(2)} s, maximo ${(Math.max(...vueltas) / 1000).toFixed(2)} s`);
    console.log('');
  } finally {
    socket?.close();
    if (propio) {
      servidor.hijo.kill();
      await sleep(300);
      for (const f of [BASE, `${BASE}-journal`]) fs.rmSync(f, { force: true });
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
