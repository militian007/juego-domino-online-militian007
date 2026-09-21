// EL SALON (seccion 196), contra el servidor levantado en localhost:4000.
//
// Lo que se comprueba: escribe el que tiene cuenta, el invitado lee; la
// moderacion del truco (enlace quitado, groseria tapada, grito bajado); el
// spam se paga con silencio; la lista de quien esta en linea; y, si el
// servidor arranco con DOMINO_SOCIOS=SocioDePrueba, que el socio baja mensajes
// y suspende con mensaje. Todo en el servidor: en la pantalla no hay freno que
// valga.
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

const pedir = (socket, evento, datos) => new Promise((resolve) => socket.emit(evento, datos, resolve));

async function main() {
  // Ids nuevos en cada corrida: el silencio por spam queda guardado en la base
  // y una cuenta repetida arrancaria callada.
  const base = 900000 + (Date.now() % 90000);
  const token = jwt.sign({ id: base, username: `Prueba${base}` }, JWT_SECRET, { expiresIn: '1h' });
  const tokenSocio = jwt.sign({ id: base + 1, username: 'SocioDePrueba' }, JWT_SECRET, { expiresIn: '1h' });

  const invitado = await conectar({ guestId: 'guest-pruebachat1', guestName: 'Visita', guestRetrato: 'tigre' });
  const cuenta = await conectar({ token });
  const socio = await conectar({ token: tokenSocio });

  // ---- 1. El invitado lee ----------------------------------------------
  invitado.emit('chat:entrar');
  const histInvitado = await proximo(invitado, 'chat:historial');
  check(Boolean(histInvitado), 'El invitado recibe el historial');
  check(histInvitado?.puedoEscribir === false, 'Al invitado se le dice que NO puede escribir');
  check(histInvitado?.vidaMinutos >= 1, `Cada mensaje vive ${histInvitado?.vidaMinutos} minutos`);

  // ---- 2. El invitado no escribe ----------------------------------------
  const rebote = await pedir(invitado, 'chat:enviar', { texto: 'deberia rebotar' });
  check(rebote?.ok === false && rebote?.code === 'invitado', 'El invitado que intenta escribir recibe "crea tu cuenta"');
  const filtrado = await proximo(invitado, 'chat:mensaje', 600);
  check(filtrado === null, 'Y su mensaje NO llega a nadie');

  // ---- 3. La cuenta escribe y le llega a todos --------------------------
  cuenta.emit('chat:entrar');
  const histCuenta = await proximo(cuenta, 'chat:historial');
  check(histCuenta?.puedoEscribir === true, 'A la cuenta se le dice que SI puede escribir');

  const texto = `hola desde la prueba ${base}`;
  const llegaAlInvitado = proximo(invitado, 'chat:mensaje');
  const enviado = await pedir(cuenta, 'chat:enviar', { texto });
  const recibido = await llegaAlInvitado;
  check(enviado?.ok === true, 'El servidor confirma el envio');
  check(recibido?.texto === texto, 'El mensaje de la cuenta le llega al invitado');
  check(recibido?.username === `Prueba${base}`, 'Llega con el nombre de quien lo escribio');

  // ---- 4. La moderacion del truco --------------------------------------
  const conEnlace = await pedir(cuenta, 'chat:enviar', { texto: 'escribeme al 0414-1234567 o a www.fichas.com' });
  check(conEnlace?.ok && conEnlace.seQuitoContacto === true, 'Telefono y enlace: se avisa que se quito contacto');
  check(!/0414|fichas\.com/.test(conEnlace?.mensaje?.texto ?? ''), `Y en la sala no salen: "${conEnlace?.mensaje?.texto}"`);
  const grosero = await pedir(cuenta, 'chat:enviar', { texto: 'eres un pendejo pero el diputado no' });
  check(grosero?.mensaje?.texto === 'eres un ******* pero el diputado no', `Groseria tapada, palabra entera nada mas: "${grosero?.mensaje?.texto}"`);
  const grito = await pedir(cuenta, 'chat:enviar', { texto: 'QUIEN JUEGA UNA PARTIDA AHORA' });
  check(grito?.mensaje?.texto === 'quien juega una partida ahora', 'El grito se baja a minusculas');

  // ---- 5. El spam se paga con silencio ---------------------------------
  // Ya van 4 en la ventana de 10 s; el quinto pasa y el sexto es spam.
  await pedir(cuenta, 'chat:enviar', { texto: 'cinco' });
  const spam = await pedir(cuenta, 'chat:enviar', { texto: 'seis' });
  check(spam?.ok === false && spam?.code === 'silenciado', `Seis en diez segundos: silencio (${spam?.error})`);
  const callado = await pedir(cuenta, 'chat:enviar', { texto: 'sigo hablando' });
  check(callado?.ok === false && /silencio/.test(callado?.error ?? ''), 'Y mientras dura, no escribe');

  // ---- 6. Quien esta en linea ------------------------------------------
  const lista = await pedir(cuenta, 'salon:gente', undefined);
  const yo = lista?.gente?.find((g) => Number(g.id) === base);
  const visita = lista?.gente?.find((g) => g.username === 'Visita');
  check(Boolean(yo) && yo.jugando === false && yo.esInvitado === false, 'La cuenta sale en la lista, sin jugar');
  check(Boolean(visita) && visita.esInvitado === true && visita.retrato === 'tigre', 'El invitado sale de visita, con su retrato');

  // ---- 7. Nadie se hace pasar por otro ---------------------------------
  const suplantado = await pedir(socio, 'chat:enviar', { texto: 'soy otro', username: 'ElJefe', userId: 1 });
  check(suplantado?.ok !== true || suplantado?.mensaje?.username === 'SocioDePrueba', 'Mandar un username distinto NO sirve: manda el del token');

  // ---- 8. El socio (solo si el servidor arranco con DOMINO_SOCIOS) -------
  socio.emit('chat:entrar');
  const histSocio = await proximo(socio, 'chat:historial');
  const noSocio = await pedir(cuenta, 'salon:ocultar', { mensajeId: recibido?.id });
  check(noSocio?.ok === false, 'Una cuenta comun no puede bajar mensajes');
  if (histSocio?.soySocio) {
    const seOculta = proximo(invitado, 'chat:oculto');
    const bajado = await pedir(socio, 'salon:ocultar', { mensajeId: recibido?.id });
    const oculto = await seOculta;
    check(bajado?.ok === true && Number(oculto?.id) === Number(recibido?.id), 'El socio baja un mensaje y todos lo ven irse');
    const seEntera = proximo(cuenta, 'chat:silenciado');
    const susp = await pedir(socio, 'salon:silenciar', { userId: base, dias: 3, mensaje: 'Aca no se insulta a nadie.' });
    const aviso = await seEntera;
    check(susp?.ok === true && aviso?.mensaje === 'Aca no se insulta a nadie.', 'Suspension de 3 dias con mensaje: al jugador le llega al momento');
    const suspendido = await pedir(cuenta, 'chat:enviar', { texto: 'hola?' });
    check(/suspendido/.test(suspendido?.error ?? '') && /Aca no se insulta/.test(suspendido?.error ?? ''), `Y al escribir lee el mensaje del socio: "${suspendido?.error}"`);
    const levantado = await pedir(socio, 'salon:levantar', { userId: base });
    check(levantado?.ok === true, 'El socio le devuelve la palabra');
  } else {
    console.log('  · (el servidor no arranco con DOMINO_SOCIOS=SocioDePrueba: lo del socio no se prueba)');
  }

  invitado.close();
  cuenta.close();
  socio.close();

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err.message);
  process.exit(1);
});
