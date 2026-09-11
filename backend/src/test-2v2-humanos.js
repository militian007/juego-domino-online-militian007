// 2 vs 2 entre CUATRO PERSONAS de verdad, contra el servidor levantado (§132).
//
//   npm run dev              (en otra consola)
//   npm run test:2v2-humanos
//
// Estaba en la lista de pendientes como "sin probar": el 2v2 se habia jugado
// siempre con bots. Lo que cambia con cuatro humanos es todo lo de alrededor
// —la sala de cuatro, los equipos, quien ve que, y sobre todo que pasa si uno
// se va a mitad de partida— y nada de eso lo cubren las pruebas del motor.
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
    setTimeout(() => reject(new Error('no conecto')), 6000);
  });

const pedir = (socket, evento, datos) =>
  new Promise((resolve) => {
    const id = setTimeout(() => resolve(null), 4000);
    socket.emit(evento, datos, (r) => {
      clearTimeout(id);
      resolve(r);
    });
  });

/** Espera un `game:state` que cumpla la condicion. */
const esperarEstado = (socket, cumple, ms = 6000) =>
  new Promise((resolve) => {
    const id = setTimeout(() => {
      socket.off('game:state', mirar);
      resolve(null);
    }, ms);
    function mirar(e) {
      if (!cumple(e)) return;
      clearTimeout(id);
      socket.off('game:state', mirar);
      resolve(e);
    }
    socket.on('game:state', mirar);
  });

/** El ultimo estado que le llego a cada uno, para poder consultarlo. */
function recordar(socket) {
  const caja = { estado: null };
  socket.on('game:state', (e) => { caja.estado = e; });
  return caja;
}

const ID_BASE = 920001;

function terminar(socks) {
  for (const s of socks) {
    try { s.close(); } catch { /* ya cerrado */ }
  }
  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

async function main() {
  const nombres = ['Cuatro1', 'Cuatro2', 'Cuatro3', 'Cuatro4'];
  const tokens = nombres.map((n, i) =>
    jwt.sign({ id: ID_BASE + i, username: n }, JWT_SECRET, { expiresIn: '1h' })
  );
  const socks = [];
  for (const t of tokens) socks.push(await conectar({ token: t }));
  const cajas = socks.map(recordar);

  // ---- 1. La sala de cuatro --------------------------------------------
  const creada = await pedir(socks[0], 'room:create', { mode: '2v2' });
  check(creada?.ok === true, 'el primero crea una mesa 2 vs 2 entre personas');
  const code = creada?.room?.code;
  check(Boolean(code), `la mesa tiene codigo (${code})`);
  check(creada?.room?.maxPlayers === 4, 'y es para cuatro');

  const antesDeTiempo = await pedir(socks[0], 'room:start', { code });
  check(antesDeTiempo?.ok === false, 'no se puede empezar con la mesa a medias');
  check(/altan/.test(antesDeTiempo?.error ?? ''), `y lo dice claro: "${antesDeTiempo?.error}"`);

  for (let i = 1; i < 4; i++) {
    const r = await pedir(socks[i], 'room:join', { code });
    check(r?.ok === true, `${nombres[i]} entra por el codigo`);
  }

  // ---- 2. Arranca -------------------------------------------------------
  const todos = socks.map((s) => esperarEstado(s, (e) => e.status === 'playing'));
  const arranque = await pedir(socks[0], 'room:start', { code });
  check(arranque?.ok === true, 'con los cuatro dentro, arranca');

  const estados = await Promise.all(todos);
  check(estados.every(Boolean), 'a los cuatro les llega el estado de la partida');
  if (!estados.every(Boolean)) return terminar(socks);

  // ---- 3. Los equipos ---------------------------------------------------
  const mio = (e, i) => e.players.find((p) => String(p.id) === String(ID_BASE + i));
  const equipos = estados.map((e, i) => mio(e, i)?.team);
  check(equipos[0] === equipos[2], `el 1 y el 3 son compañeros (equipo ${equipos[0]})`);
  check(equipos[1] === equipos[3], `el 2 y el 4 son compañeros (equipo ${equipos[1]})`);
  check(equipos[0] !== equipos[1], 'y los dos equipos son distintos');

  const asientos = estados.map((e, i) => mio(e, i)?.seat);
  check(new Set(asientos).size === 4, `cada uno en su asiento (${asientos.join(', ')})`);

  // ---- 4. Nadie ve la mano de nadie -------------------------------------
  check(estados.every((e) => (e.myHand?.length ?? 0) === 7), 'cada uno tiene sus siete fichas');
  const manos = estados.map((e) => JSON.stringify(e.myHand));
  check(new Set(manos).size === 4, 'y las cuatro manos son distintas');
  check(
    estados.every((e) => !JSON.stringify(e.players).includes('"hand"')),
    'el estado NO lleva la mano de los demas'
  );
  check(estados.every((e) => e.hasPool === false), 'en 2v2 no hay pozo');

  // ---- 5. Se juega de verdad, por turnos --------------------------------
  let jugadas = 0;
  let rechazos = 0;
  let probadoFueraDeTurno = false;

  for (let vuelta = 0; vuelta < 30; vuelta++) {
    const turno = cajas.findIndex((c, i) => {
      const e = c.estado;
      return e && e.status === 'playing' && String(e.currentPlayerId) === String(ID_BASE + i);
    });
    if (turno < 0) { await esperar(200); continue; }

    // De paso: al que NO le toca, el servidor tiene que rechazarle la jugada.
    if (!probadoFueraDeTurno) {
      probadoFueraDeTurno = true;
      const otro = (turno + 1) % 4;
      const cuela = await pedir(socks[otro], 'game:play', { code, tileIndex: 0, side: 'left' });
      check(cuela?.ok === false, `jugar fuera de turno se rechaza ("${cuela?.error}")`);
      if (cuela?.ok === false) rechazos++;
    }

    const e = cajas[turno].estado;
    const mov = e.validMoves?.[0];
    if (mov) {
      const r = await pedir(socks[turno], 'game:play', {
        code,
        tileIndex: mov.index,
        side: mov.side,
        x: mov.x,
        y: mov.y,
        x2: mov.x2,
        y2: mov.y2,
        orientation: mov.orientation
      });
      if (r?.ok) jugadas++;
    } else {
      await pedir(socks[turno], 'game:pass', { code });
    }
    await esperar(220);
  }

  check(jugadas >= 8, `se jugaron fichas por turnos (${jugadas})`);
  check(rechazos === 1, 'y el servidor freno al que no le tocaba');

  const mesa = cajas[0].estado?.board?.length ?? 0;
  check(mesa >= 8, `la cadena crecio (${mesa} fichas)`);
  check(
    cajas.every((c) => (c.estado?.board?.length ?? -1) === mesa),
    'los cuatro ven la MISMA mesa'
  );

  // ---- 6. Uno se cae a mitad de partida ---------------------------------
  const seCae = 3;
  const aviso = esperarEstado(socks[0], (e) => (e.ausentes?.length ?? 0) > 0, 8000);
  socks[seCae].close();
  const conAusente = await aviso;
  check(Boolean(conAusente), 'si uno se cae, a los demas les avisa el estado');
  if (conAusente) {
    const a = conAusente.ausentes[0];
    check(a.username === nombres[seCae], `y dice quien es (${a.username})`);
    check(a.restanteMs > 0, `con el tiempo que le queda (${Math.round(a.restanteMs / 1000)}s)`);
  }

  // ---- 7. Y puede volver ------------------------------------------------
  //
  // OJO con el orden: el servidor manda el `game:state` ANTES de contestar el
  // callback de `room:join`. Si se escucha despues de que vuelva el callback,
  // ya paso y parece que no llego nunca. Por eso se escucha antes de pedir.
  const vuelve = await conectar({ token: tokens[seCae] });
  const cajaVuelve = recordar(vuelve);
  const suEstado = esperarEstado(vuelve, (e) => e.status === 'playing', 8000);

  const rejoin = await pedir(vuelve, 'room:join', { code });
  check(rejoin?.ok === true, 'el que se cayo puede volver con el mismo codigo');

  const recuperado = (await suEstado) ?? cajaVuelve.estado;
  check(Boolean(recuperado), 'y recupera la partida donde iba');
  if (recuperado) {
    check((recuperado.myHand?.length ?? 0) > 0, `con su mano intacta (${recuperado.myHand?.length} fichas)`);
    check((recuperado.board?.length ?? 0) >= mesa, 'y la mesa como estaba');
  }

  // Lo mismo aqui: se mira el ULTIMO estado que le llego al de al lado, no se
  // espera uno nuevo que quiza ya paso.
  await esperar(600);
  check((cajas[0].estado?.ausentes?.length ?? -1) === 0, 'a los demas se les quita el aviso de ausente');

  // ---- 8. Y si uno se va DEL TODO ---------------------------------------
  //
  // Es lo peor que puede pasar en un 2v2: si el juego se queda esperando el
  // turno del que se fue, los otros TRES quedan mirando una mesa muerta. Va al
  // final porque cierra la partida.
  // Tiene que estar JUGANDOSE. Si la ronda ya cerro no hay nada que abandonar,
  // y la prueba pasaria por el motivo equivocado.
  if (cajas[0].estado?.status === 'round-end') {
    const arranca = esperarEstado(socks[0], (e) => e.status === 'playing', 6000);
    await pedir(socks[0], 'game:next-round', { code });
    await arranca;
  }
  const antesDeIrse = cajas[0].estado?.status;
  check(antesDeIrse === 'playing', 'se prueba el abandono con la partida EN CURSO');

  const cierre = esperarEstado(socks[0], (e) => e.endReason === 'forfeit', 8000);
  await pedir(socks[1], 'room:leave', { code });

  const final = (await cierre) ?? cajas[0].estado;
  check(
    final?.endReason === 'forfeit',
    `si uno abandona, la partida se cierra por abandono (antes estaba en "${antesDeIrse}", quedo en "${final?.status}" / "${final?.endReason}")`
  );
  if (final) {
    check(final.status !== 'playing', `nadie se queda esperando su turno (estado: ${final.status})`);
    await esperar(400);
    const quedan = [cajas[0], cajas[2]].every((c) => c.estado?.status !== 'playing');
    check(quedan, 'y a los demas de la mesa tambien les llega el cierre');
  }

  vuelve.close();
  terminar(socks);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err.message);
  process.exit(1);
});
