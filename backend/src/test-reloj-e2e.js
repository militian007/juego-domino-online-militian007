// El reloj, por sockets, con dos jugadores de verdad.
//
// Se emparejan dos cuentas en un 1 vs 1, NADIE juega, y se comprueba que la
// ronda se pierda sola a los 25 segundos. Tarda medio minuto: es el precio de
// probar un reloj de verdad en vez de creerle al codigo.
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

const conectar = (id, nombre) =>
  new Promise((resolve, reject) => {
    const s = ioClient(URL, {
      auth: { token: jwt.sign({ id, username: nombre }, JWT_SECRET, { expiresIn: '1h' }) },
      transports: ['polling', 'websocket']
    });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('no conecto')), 8000);
  });

/** Espera el primer estado que cumpla la condicion. */
const esperarEstado = (socket, condicion, ms) =>
  new Promise((resolve) => {
    const id = setTimeout(() => { socket.off('game:state', mirar); resolve(null); }, ms);
    function mirar(estado) {
      if (!condicion(estado)) return;
      clearTimeout(id);
      socket.off('game:state', mirar);
      resolve(estado);
    }
    socket.on('game:state', mirar);
  });

async function main() {
  const uno = await conectar(601, 'RelojUno');
  const dos = await conectar(602, 'RelojDos');

  const primerEstado = esperarEstado(uno, (e) => e.status === 'playing', 15000);
  uno.emit('matchmaking:join', { mode: '1v1' });
  dos.emit('matchmaking:join', { mode: '1v1' });

  const estado = await primerEstado;
  check(Boolean(estado), 'Se armo la partida entre las dos cuentas');
  if (!estado) { fin(); return; }

  check(estado.turnMs === 25000, 'El estado dice que el turno dura 25 segundos');
  check(
    estado.turnRestanteMs > 20000 && estado.turnRestanteMs <= 25000,
    `Y dice cuanto falta (${Math.round(estado.turnRestanteMs / 1000)}s)`
  );
  check(Array.isArray(estado.ausentes) && estado.ausentes.length === 0, 'No hay nadie ausente');

  console.log('  … esperando los 25 segundos sin que nadie juegue');

  const turnoInicial = estado.currentPlayerId;
  const saltado = await esperarEstado(uno, (e) => e.saltadoPorTiempo != null, 32000);
  check(Boolean(saltado), 'Cuando se acaba el tiempo, el turno pasa solo');

  if (saltado) {
    check(saltado.currentPlayerId !== turnoInicial, 'Y le toca al otro jugador');
    check(
      (saltado.teamScores?.[1] ?? 0) + (saltado.teamScores?.[2] ?? 0) === 0,
      'Nadie suma puntos por esto'
    );
    check(saltado.status === 'playing', 'La ronda sigue, no se cierra');
    // La causa del contador que no se borraba: al empezar cualquier turno
    // "cuanto falta" vale 25000, siempre el mismo numero, y la pantalla no
    // tenia como notar que era un turno nuevo. Por eso ahora va un id aparte.
    check(
      Boolean(saltado.turnoId) && saltado.turnoId !== estado.turnoId,
      'El turno nuevo se distingue del anterior (si no, la cuenta atras se queda pegada)'
    );
    // Sin esto el turno cambia solo y parece un error del juego.
    check(
      typeof saltado.saltadoPorTiempo?.username === 'string',
      'El estado dice a quien saltaron, para poder avisarlo en pantalla'
    );
  }

  // ---- El aviso de desconexion -----------------------------------------
  const avisoDeCaida = esperarEstado(uno, (e) => e.ausentes?.length > 0, 8000);
  dos.close();

  const conAusente = await avisoDeCaida;
  check(Boolean(conAusente), 'Al que se queda le llega el aviso de que el otro se cayo');
  if (conAusente) {
    check(conAusente.ausentes[0].username === 'RelojDos', 'Con el nombre del que se fue');
    check(
      conAusente.ausentes[0].restanteMs > 55000,
      `Y con los 60 segundos que tiene para volver (${Math.round(conAusente.ausentes[0].restanteMs / 1000)}s)`
    );
  }

  fin();
}

function fin() {
  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => { console.error('La prueba se rompio:', err.message); process.exit(1); });
