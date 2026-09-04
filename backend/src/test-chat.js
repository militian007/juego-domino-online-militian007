// El chat global, contra el servidor levantado en localhost:4000.
//
// Lo que se comprueba es lo que decidio Jonathan: escribe el que tiene cuenta,
// el invitado lee. Y que los frenos esten donde tienen que estar, que es en el
// servidor: si estuvieran solo en la pantalla, cualquiera los saltea.
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { io as ioClient } from 'socket.io-client';

const URL = 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const conectar = (auth) =>
  new Promise((resolve, reject) => {
    const s = ioClient(URL, { auth, transports: ['polling', 'websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('no conecto')), 5000);
  });

/** Espera un evento, o null si no llega. */
const proximo = (socket, evento, ms = 2500) =>
  new Promise((resolve) => {
    const id = setTimeout(() => { socket.off(evento, alLlegar); resolve(null); }, ms);
    function alLlegar(datos) { clearTimeout(id); socket.off(evento, alLlegar); resolve(datos); }
    socket.on(evento, alLlegar);
  });

async function main() {
  const token = jwt.sign({ id: 900001, username: 'UnoDePrueba' }, JWT_SECRET, { expiresIn: '1h' });

  const invitado = await conectar({ guestId: 'guest-pruebachat1' });
  const cuenta = await conectar({ token });

  // ---- 1. El invitado lee ----------------------------------------------
  invitado.emit('chat:entrar');
  const histInvitado = await proximo(invitado, 'chat:historial');
  check(Boolean(histInvitado), 'El invitado recibe el historial');
  check(histInvitado?.puedoEscribir === false, 'Al invitado se le dice que NO puede escribir');

  // ---- 2. El invitado no escribe ----------------------------------------
  invitado.emit('chat:enviar', { texto: 'deberia rebotar' });
  const errorInvitado = await proximo(invitado, 'chat:error');
  check(Boolean(errorInvitado), 'El invitado que intenta escribir recibe un aviso');

  const filtrado = await proximo(invitado, 'chat:mensaje', 800);
  check(filtrado === null, 'Y su mensaje NO llega a nadie');

  // ---- 3. La cuenta escribe y le llega a todos --------------------------
  cuenta.emit('chat:entrar');
  const histCuenta = await proximo(cuenta, 'chat:historial');
  check(histCuenta?.puedoEscribir === true, 'A la cuenta se le dice que SI puede escribir');

  const texto = `hola desde la prueba ${Date.now()}`;
  const llegaAlInvitado = proximo(invitado, 'chat:mensaje');
  cuenta.emit('chat:enviar', { texto });

  const recibido = await llegaAlInvitado;
  check(recibido?.texto === texto, 'El mensaje de la cuenta le llega al invitado');
  check(recibido?.username === 'UnoDePrueba', 'Llega con el nombre de quien lo escribio');

  // ---- 4. El freno de velocidad ----------------------------------------
  cuenta.emit('chat:enviar', { texto: 'segundo mensaje inmediato' });
  const frenado = await proximo(cuenta, 'chat:error');
  check(Boolean(frenado), 'Dos mensajes seguidos: el segundo se frena');

  // ---- 5. Nadie se hace pasar por otro ---------------------------------
  await esperar(1700);
  const llegaSuplantado = proximo(invitado, 'chat:mensaje');
  cuenta.emit('chat:enviar', { texto: 'soy otro', username: 'ElJefe', userId: 1 });
  const suplantado = await llegaSuplantado;
  check(
    suplantado?.username === 'UnoDePrueba',
    'Mandar un username distinto NO sirve: manda el del token'
  );

  invitado.close();
  cuenta.close();

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err.message);
  process.exit(1);
});
