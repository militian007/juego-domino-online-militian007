// El chat de la mesa, contra el servidor levantado en localhost:4000.
//
//   npm run dev        (en otra consola)
//   npm run test:mesa-chat
//
// Lo que se comprueba es lo que de verdad importa: que hablen los que estan
// SENTADOS en esa mesa y nadie mas. Los frenos van en el servidor; si estuvieran
// solo en la pantalla, cualquiera los saltea desde el navegador.
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

/** Manda algo y espera la respuesta del servidor. */
const pedir = (socket, evento, datos) =>
  new Promise((resolve) => {
    const id = setTimeout(() => resolve(null), 3000);
    socket.emit(evento, datos, (r) => { clearTimeout(id); resolve(r); });
  });

/** Espera un evento, o null si no llega. */
const proximo = (socket, evento, ms = 2500) =>
  new Promise((resolve) => {
    const id = setTimeout(() => { socket.off(evento, alLlegar); resolve(null); }, ms);
    function alLlegar(datos) { clearTimeout(id); socket.off(evento, alLlegar); resolve(datos); }
    socket.on(evento, alLlegar);
  });

async function main() {
  const tokenUno = jwt.sign({ id: 910001, username: 'MesaUno' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenDos = jwt.sign({ id: 910002, username: 'MesaDos' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenTres = jwt.sign({ id: 910003, username: 'MesaFuera' }, JWT_SECRET, { expiresIn: '1h' });

  const uno = await conectar({ token: tokenUno });
  const dos = await conectar({ token: tokenDos });
  const fuera = await conectar({ token: tokenTres });
  const invitado = await conectar({ guestId: 'guest-mesachat' });

  // ---- 1. Una mesa 1v1 entre dos personas -------------------------------
  const creada = await pedir(uno, 'room:create', { mode: '1v1' });
  check(creada?.ok === true, 'se crea una mesa 1 vs 1 entre personas');
  const code = creada?.room?.code;
  check(Boolean(code), `y tiene codigo (${code})`);

  const entrada = await pedir(dos, 'room:join', { code });
  check(entrada?.ok === true, 'el segundo se sienta en la mesa');

  // ---- 2. Los sentados se hablan ----------------------------------------
  await pedir(uno, 'mesa:chat:entrar', { code });
  const escucha = proximo(dos, 'mesa:chat:mensaje');
  const enviado = await pedir(uno, 'mesa:chat:enviar', { code, texto: 'epa pana, arranca' });
  check(enviado?.ok === true, 'el primero puede escribir');

  const recibido = await escucha;
  check(recibido?.texto === 'epa pana, arranca', 'y al segundo le llega el mensaje');
  check(recibido?.username === 'MesaUno', 'con el nombre del que lo escribio');

  // ---- 3. El nombre lo pone el servidor, no el navegador ----------------
  await esperar(1300);
  const escucha2 = proximo(dos, 'mesa:chat:mensaje');
  await pedir(uno, 'mesa:chat:enviar', { code, texto: 'soy otro', username: 'ElPresidente' });
  const suplantado = await escucha2;
  check(
    suplantado?.username === 'MesaUno',
    'mandar un nombre distinto no sirve: el servidor usa el del token'
  );

  // ---- 4. El de afuera no puede escribir ni leer ------------------------
  const deFuera = await pedir(fuera, 'mesa:chat:enviar', { code, texto: 'hola desde afuera' });
  check(deFuera?.ok === false, 'quien no esta sentado en la mesa NO puede escribir');

  const entrarDeFuera = await pedir(fuera, 'mesa:chat:entrar', { code });
  check(entrarDeFuera?.ok !== true, 'ni ver lo que se dijo');

  const deInvitado = await pedir(invitado, 'mesa:chat:enviar', { code, texto: 'invitado' });
  check(deInvitado?.ok === false, 'un invitado tampoco escribe');

  // ---- 5. El historial le llega al que se reconecta ---------------------
  const alEntrar = await pedir(dos, 'mesa:chat:entrar', { code });
  check(alEntrar?.ok === true, 'el que se sienta recibe lo que se dijo antes');
  check((alEntrar?.mensajes?.length ?? 0) >= 2, `y son los mensajes de esta mesa (${alEntrar?.mensajes?.length})`);

  // ---- 6. Los frenos --------------------------------------------------
  const seguido = await pedir(uno, 'mesa:chat:enviar', { code, texto: 'otra vez' });
  check(seguido?.ok === false, 'dos mensajes pegados: el segundo se frena');

  await esperar(1300);
  const vacio = await pedir(uno, 'mesa:chat:enviar', { code, texto: '    ' });
  check(vacio?.ok === false, 'un mensaje vacio no pasa');

  await esperar(1300);
  const largo = 'x'.repeat(400);
  const escucha3 = proximo(dos, 'mesa:chat:mensaje');
  await pedir(uno, 'mesa:chat:enviar', { code, texto: largo });
  const cortado = await escucha3;
  check((cortado?.texto?.length ?? 999) <= 160, `un mensaje larguisimo se corta (${cortado?.texto?.length})`);

  // ---- 7. Contra la maquina no hay chat --------------------------------
  const conBot = await pedir(uno, 'room:create', { mode: '1v1bot' });
  const codeBot = conBot?.room?.code;
  await esperar(1300);
  const enMesaDeBot = await pedir(uno, 'mesa:chat:enviar', { code: codeBot, texto: 'hola maquina' });
  check(enMesaDeBot?.ok === false, 'en las partidas contra la maquina no hay chat');

  // ---- 8. Una mesa no oye lo de la otra ---------------------------------
  const otra = await pedir(dos, 'room:create', { mode: '1v1' });
  const codeOtra = otra?.room?.code;
  const noDeberiaLlegar = proximo(uno, 'mesa:chat:mensaje', 1200);
  await esperar(1300);
  await pedir(dos, 'mesa:chat:enviar', { code: codeOtra, texto: 'esto es de otra mesa' });
  check(await noDeberiaLlegar === null, 'lo que se dice en una mesa no se oye en otra');

  uno.close();
  dos.close();
  fuera.close();
  invitado.close();

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err.message);
  process.exit(1);
});
