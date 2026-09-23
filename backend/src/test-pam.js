// LA PUERTA DEL CLUB (seccion 203), contra una PAM DE MENTIRA que habla el
// contrato de la ventanilla: se comprueba la firma, el canje de la ficha, el
// espejo en `users`, la llave del domino, el saldo y los rebotes.
//
// No toca la PAM de verdad: levanta su propio servidorcito en :4199.
import 'dotenv/config';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { firmar } from './services/ventanilla.js';
import * as pam from './services/pam.js';
import { query, initDatabase } from './config/database.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

const SECRETO = 'secreto-de-mentira';
const OPERADOR = 'domino-prueba';
const FICHAS = new Map([
  ['ficha-de-raul', { playerId: 'uuid-raul', displayName: 'Raúl', currency: 'VES', balance: '1250000' }],
  ['ficha-de-chuo', { playerId: 'uuid-chuo', displayName: 'Chuo', currency: 'VES', balance: '40000' }],
  ['ficha-del-bloqueado', { bloqueado: true }],
  ['ficha-con-nombre-raro', { playerId: 'uuid-raro', displayName: '<<<>>>', currency: 'VES', balance: '0' }]
]);
const PASES = new Map();
let firmasMalas = 0;

const laPamDeMentira = http.createServer((req, res) => {
  let crudo = '';
  req.on('data', (t) => { crudo += t; });
  req.on('end', () => {
    const responder = (codigo, cuerpo) => {
      res.writeHead(codigo, { 'content-type': 'application/json' });
      res.end(JSON.stringify(cuerpo));
    };
    // La firma, igual que la de verdad: cuerpo + reloj + path.
    const esperada = firmar(SECRETO, crudo, req.headers['x-ventanilla-reloj'], new URL(req.url, 'http://x').pathname);
    if (req.headers['x-ventanilla-firma'] !== esperada || req.headers['x-ventanilla-operador'] !== OPERADOR) {
      firmasMalas += 1;
      return responder(401, { code: 'BAD_SIGNATURE', message: 'firma mala' });
    }
    const cuerpo = JSON.parse(crudo || '{}');
    if (req.url.endsWith('/authenticate')) {
      const f = FICHAS.get(cuerpo.launchToken);
      if (!f) return responder(401, { code: 'INVALID_TOKEN', message: 'ficha mala' });
      if (f.bloqueado) return responder(403, { code: 'PLAYER_BLOCKED', message: 'bloqueado' });
      const playerToken = `pase-${f.playerId}`;
      PASES.set(playerToken, f);
      return responder(200, { playerToken, playerId: f.playerId, displayName: f.displayName, currency: f.currency, balance: f.balance });
    }
    if (req.url.endsWith('/balance')) {
      const f = PASES.get(cuerpo.playerToken);
      if (!f) return responder(401, { code: 'INVALID_TOKEN', message: 'pase vencido' });
      return responder(200, { balance: f.balance, currency: f.currency });
    }
    responder(404, { code: 'PAM_MAINTENANCE', message: 'no existe' });
  });
});

async function main() {
  await initDatabase();
  await new Promise((r) => laPamDeMentira.listen(4199, r));
  process.env.VENTANILLA_URL = 'http://127.0.0.1:4199';
  process.env.VENTANILLA_OPERADOR = OPERADOR;
  process.env.VENTANILLA_SECRETO = SECRETO;
  delete process.env.DOMINO_CUENTAS;
  pam.__ponerClienteParaPruebas(null);
  pam.__limpiarPasesParaPruebas();
  await query('DELETE FROM users WHERE pam_uuid IS NOT NULL', []).catch(() => {});

  check(pam.modo() === 'pam', 'con la ventanilla configurada, las cuentas son de la PAM');

  // ---- 1. La ficha se canjea y queda el espejo ----
  const r = await pam.entrar('ficha-de-raul');
  check(!r.error && r.user?.username === 'Raúl', `la ficha entra como Raúl (${r.error ?? r.user?.username})`);
  check(r.saldo === '1250000' && r.moneda === 'VES', 'y trae el saldo de verdad del club');
  const dentro = jwt.verify(r.token, process.env.JWT_SECRET || 'dev-secret');
  check(Number(dentro.id) === Number(r.user.id), 'la llave del domino es la de siempre (el JWT)');
  const { rows } = await query('SELECT pam_uuid, password_hash FROM users WHERE id = ?', [r.user.id]);
  check(rows[0].pam_uuid === 'uuid-raul', 'el espejo guarda el uuid de la PAM');
  check(String(rows[0].password_hash).startsWith('pam:'), 'y NO guarda clave: a esa cuenta se entra por el club');

  // ---- 2. La segunda ficha del mismo es la misma cuenta ----
  const otra = await pam.entrar('ficha-de-raul');
  check(Number(otra.user.id) === Number(r.user.id), 'volver a entrar no crea otra cuenta');

  // ---- 3. Otro jugador, otra cuenta ----
  const chuo = await pam.entrar('ficha-de-chuo');
  check(chuo.user.username === 'Chuo' && Number(chuo.user.id) !== Number(r.user.id), 'otro jugador, otra cuenta');

  // ---- 4. El saldo por la ventanilla ----
  const s = await pam.saldo(r.user.id);
  check(s.saldo === '1250000', 'el saldo sale por la ventanilla, con el pase del jugador');
  const sinPase = await pam.saldo(999999);
  check(sinPase.error === 'SESION_VENCIDA', 'sin pase, sesión vencida');

  // ---- 5. Los rebotes ----
  check((await pam.entrar('ficha-que-no-existe')).error === 'FICHA_MALA', 'una ficha que no existe: FICHA_MALA');
  check((await pam.entrar('ficha-del-bloqueado')).error === 'BLOQUEADO', 'un jugador bloqueado en el club no entra');

  // ---- 6. Un nombre raro no rompe la mesa ----
  const raro = await pam.entrar('ficha-con-nombre-raro');
  check(raro.user.username.length >= 2, `un nombre con símbolos queda usable: «${raro.user.username}»`);

  // ---- 7. Sin ventanilla, el domino sigue como hasta hoy ----
  delete process.env.VENTANILLA_URL;
  check(pam.modo() === 'propio' && (await pam.entrar('ficha-de-raul')).error === 'SIN_PAM', 'sin ventanilla: cuentas propias y SIN_PAM');
  check(firmasMalas === 0, 'todas las peticiones fueron firmadas como manda el contrato');

  await new Promise((r) => laPamDeMentira.close(r));
  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  // Sin process.exit: la base de node:sqlite se queja si se sale con el
  // manejador abierto («UV_HANDLE_CLOSING»). Se deja el codigo y se termina.
  process.exitCode = fallados > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('La prueba se rompió:', err);
  process.exitCode = 1;
});
