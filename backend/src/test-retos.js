// Retos entre jugadores y el buzon de avisos, contra el servidor levantado.
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { io as ioClient } from 'socket.io-client';

const URL = 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

let pasados = 0, fallados = 0;
const check = (ok, texto) => { console.log(`  ${ok ? '✓' : '✗'} ${texto}`); ok ? pasados++ : fallados++; };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const conectar = (auth) =>
  new Promise((resolve, reject) => {
    const s = ioClient(URL, { auth, transports: ['polling', 'websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('no conecto')), 8000);
  });

const cuenta = (id, nombre) => ({ token: jwt.sign({ id, username: nombre }, JWT_SECRET, { expiresIn: '1h' }) });

const proximo = (socket, evento, ms = 4000) =>
  new Promise((resolve) => {
    const id = setTimeout(() => { socket.off(evento, ver); resolve(null); }, ms);
    function ver(d) { clearTimeout(id); socket.off(evento, ver); resolve(d); }
    socket.on(evento, ver);
  });

const pedir = (socket, evento, datos) =>
  new Promise((resolve) => {
    const args = datos === undefined ? [evento] : [evento, datos];
    socket.emit(...args, resolve);
    setTimeout(() => resolve(null), 4000);
  });

async function main() {
  const A = await conectar(cuenta(810001, 'RetadorA'));
  const B = await conectar(cuenta(810002, 'RetadoB'));
  const invitado = await conectar({ guestId: 'guest-pruebaretos' });

  // ---- 1. Un invitado no puede retar ----------------------------------
  const r0 = await pedir(invitado, 'reto:enviar', { paraId: 810002, paraNombre: 'RetadoB' });
  check(r0?.ok === false, 'Un invitado no puede retar a nadie');

  // ---- 2. No se puede uno retar a si mismo -----------------------------
  const r1 = await pedir(A, 'reto:enviar', { paraId: 810001, paraNombre: 'RetadorA' });
  check(r1?.ok === false, 'Nadie puede retarse a si mismo');

  // ---- 3. No se puede retar a quien no esta ---------------------------
  const r2 = await pedir(A, 'reto:enviar', { paraId: 899999, paraNombre: 'Fantasma' });
  check(r2?.ok === false, 'No se puede retar a quien no esta en linea');

  // ---- 4. El reto le llega al otro ------------------------------------
  const llegaElReto = proximo(B, 'reto:recibido');
  const llegaElAviso = proximo(B, 'notif:nueva');
  const r3 = await pedir(A, 'reto:enviar', { paraId: 810002, paraNombre: 'RetadoB' });
  check(r3?.ok === true, 'El reto sale');

  const recibido = await llegaElReto;
  check(Boolean(recibido), 'Y le llega al retado al momento');
  check(recibido?.deNombre === 'RetadorA', 'Con el nombre de quien lo reto');
  check(recibido?.restanteMs > 55000, `Y con el minuto para contestar (${Math.round((recibido?.restanteMs ?? 0) / 1000)}s)`);

  const aviso = await llegaElAviso;
  check(aviso?.tipo === 'reto', 'Ademas le entra un aviso al buzon');

  // ---- 5. El buzon lo guarda -------------------------------------------
  const buzon = await pedir(B, 'notif:listar');
  check(buzon?.ok === true && buzon.notificaciones.length > 0, 'El buzon trae los avisos guardados');
  check(buzon?.sinLeer > 0, 'Y cuenta los que no leyo');

  // ---- 6. No se puede retar dos veces al mismo -------------------------
  await esperar(5200);   // se respeta la espera entre retos
  const r4 = await pedir(A, 'reto:enviar', { paraId: 810002, paraNombre: 'RetadoB' });
  check(r4?.ok === false, 'No se puede retar dos veces a quien todavia no contesto');

  // ---- 7. Aceptar arma la mesa para los dos ----------------------------
  const aceptaA = proximo(A, 'reto:aceptado');
  const aceptaB = proximo(B, 'reto:aceptado');
  const r5 = await pedir(B, 'reto:responder', { id: recibido.id, acepto: true });
  check(r5?.ok === true && Boolean(r5.code), 'El retado acepta y se arma la mesa');

  const enA = await aceptaA;
  const enB = await aceptaB;
  check(Boolean(enA) && Boolean(enB), 'A los dos les llega el codigo de la mesa');
  check(enA?.code === enB?.code, 'Y es la MISMA mesa para los dos');

  // ---- 8. Marcar leidas ------------------------------------------------
  await pedir(B, 'notif:marcar-leidas');
  const buzon2 = await pedir(B, 'notif:listar');
  check(buzon2?.sinLeer === 0, 'Al abrir el buzon dejan de contar como sin leer');

  // ---- 9. Un reto que ya se contesto no se puede contestar de nuevo ----
  const r6 = await pedir(B, 'reto:responder', { id: recibido.id, acepto: true });
  check(r6?.ok === false, 'Un reto ya contestado no se puede contestar otra vez');

  A.close(); B.close(); invitado.close();
  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => { console.error('La prueba se rompio:', err.message); process.exit(1); });
