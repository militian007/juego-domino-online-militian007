import * as Torneo from '../models/Torneo.js';
import * as Ranking from '../models/Ranking.js';
import * as Notificacion from '../models/Notificacion.js';
import { TIPO } from '../models/Notificacion.js';

/**
 * El motor de los torneos.
 *
 * Copia la forma de "El Relampago" de PrivoyTruco: uno cada media hora, gratis,
 * te anotas, se arma la llave y el que gana se la lleva. La diferencia es el
 * premio: aca son **puntos de clasificacion y una copa**, no plata, porque
 * todavia no hay pasarela de pago. Decision de Jonathan.
 *
 * ## Como funciona la llave
 *
 * Es eliminacion directa. Se empareja de a dos, los que ganan pasan de ronda y
 * los que pierden quedan afuera. Si en una ronda queda un numero impar, uno
 * pasa **de arriba** sin jugar (el "bye" de toda la vida).
 *
 * ## Por que hay un reloj para presentarse
 *
 * Un torneo donde alguien se anota y no aparece se queda trabado para siempre,
 * y con el se traba todo el cuadro. Por eso, cuando se arma una partida, los dos
 * tienen un rato para entrar a la mesa; el que no llega **pierde por no
 * presentarse**, igual que en un torneo de verdad.
 */

/** Cada cuanto sale un torneo. Se puede bajar por variable de entorno. */
const CADA_MINUTOS = Number(process.env.TORNEO_CADA_MIN || 30);

/** Cuantos torneos futuros se dejan anunciados. */
const ANUNCIADOS = 8;

/** Con cuanta gente arranca. Menos de dos no es un torneo. */
const MINIMO = 2;

/** Los puntos que se lleva el campeon. */
const PREMIO = Number(process.env.TORNEO_PREMIO || 100);

/** Cuanto tiempo tiene cada uno para entrar a su mesa. */
const MS_PARA_PRESENTARSE = Number(process.env.TORNEO_ESPERA_MS || 45_000);

/** Cada cuanto se revisa si hay algo que hacer. */
const LATIDO_MS = 10_000;

const NOMBRE = 'El Relámpago';

let io = null;
let roomManager = null;
let latido = null;

/** Las mesas del torneo que estan esperando que la gente entre. */
const esperando = new Map();

const salaDe = (userId) => `user:${userId}`;

/** La proxima hora en punto o y media, a partir de ahora. */
export const proximaFranja = (desde = new Date()) => {
  const d = new Date(desde.getTime());
  d.setSeconds(0, 0);
  const minutos = d.getMinutes();
  const siguiente = Math.ceil((minutos + 1) / CADA_MINUTOS) * CADA_MINUTOS;
  d.setMinutes(siguiente);
  return d;
};

/** Deja anunciados los proximos torneos, si faltan. */
export const programar = async () => {
  let cuando = proximaFranja();

  for (let i = 0; i < ANUNCIADOS; i++) {
    const iso = cuando.toISOString();
    if (!(await Torneo.hayAEsaHora(iso))) {
      await Torneo.crear({ nombre: NOMBRE, empiezaEn: iso, premioPuntos: PREMIO });
    }
    cuando = new Date(cuando.getTime() + CADA_MINUTOS * 60_000);
  }
};

const avisar = async (userId, aviso) => {
  try {
    const guardado = await Notificacion.crear({ userId, ...aviso });
    io?.to(salaDe(userId)).emit('notif:nueva', guardado);
  } catch (err) {
    console.error('No se pudo avisar del torneo:', err.message);
  }
};

/**
 * Arma una mesa entre dos y les avisa.
 *
 * La mesa se crea con el primero de anfitrion; el segundo entra cuando su
 * pantalla lo lleve. Que la partida arranque sola cuando esten los dos lo hace
 * `intentarArrancar`, que llama el socket al entrar cada uno.
 */
const armarMesa = async (torneo, unoId, unoNombre, dosId, dosNombre) => {
  const sala = roomManager.createRoom({ mode: '1v1', hostId: unoId, hostUsername: unoNombre });
  roomManager.joinRoom(sala.code, { userId: dosId, username: dosNombre, socketId: null });

  sala.torneoId = torneo.id;
  sala.autoArranque = true;

  for (const [id, contra] of [[unoId, dosNombre], [dosId, unoNombre]]) {
    io?.to(salaDe(id)).emit('torneo:partida', {
      torneoId: torneo.id,
      torneo: torneo.nombre,
      code: sala.code,
      contra,
      esperaMs: MS_PARA_PRESENTARSE
    });
    await avisar(id, {
      tipo: TIPO.TORNEO,
      titulo: `${torneo.nombre}: te toca jugar`,
      cuerpo: `Contra ${contra}. Entrá a la mesa antes de que se te pase.`,
      datos: { torneoId: torneo.id, code: sala.code }
    });
  }

  // El reloj para presentarse. Si al vencer la partida no arranco, gana el que
  // si entro; si no entro ninguno, los dos quedan afuera.
  const reloj = setTimeout(() => resolverPlanton(sala.code), MS_PARA_PRESENTARSE);
  reloj.unref?.();
  esperando.set(sala.code, { torneoId: torneo.id, unoId, dosId, reloj });
};

/** Lo llama el socket cuando alguien entra a una mesa de torneo. */
export const intentarArrancar = (sala) => {
  if (!sala?.torneoId || !sala.autoArranque || sala.started) return;

  const listos = sala.players.filter((p) => p.socketId);
  if (listos.length < sala.config.totalPlayers) return;

  const espera = esperando.get(sala.code);
  if (espera) clearTimeout(espera.reloj);

  const r = roomManager.startGame(sala.code);
  if (r?.error) {
    console.error('No se pudo arrancar la mesa del torneo:', r.error);
    return;
  }
  roomManager.broadcastState(sala);
};

/** Alguien no se presento a su mesa. */
async function resolverPlanton(code) {
  const espera = esperando.get(code);
  if (!espera) return;
  esperando.delete(code);

  const sala = roomManager.rooms.get(code);
  if (!sala || sala.started) return;

  const presentes = sala.players.filter((p) => p.socketId).map((p) => Number(p.id));
  const { torneoId, unoId, dosId } = espera;

  for (const id of [unoId, dosId]) {
    if (!presentes.includes(Number(id))) {
      await Torneo.eliminar(torneoId, id);
      await avisar(id, {
        tipo: TIPO.TORNEO,
        titulo: 'Quedaste fuera del torneo',
        cuerpo: 'No entraste a tu mesa a tiempo.',
        datos: { torneoId }
      });
    }
  }

  roomManager.rooms.delete(code);
  await seguirLaLlave(torneoId);
}

/** Empareja a los que quedan en pie y arma las mesas de la ronda. */
async function seguirLaLlave(torneoId) {
  const torneo = await Torneo.porId(torneoId);
  if (!torneo || torneo.estado !== Torneo.ESTADO.JUGANDO) return;

  const vivos = await Torneo.enPie(torneoId);

  if (vivos.length === 0) {
    await Torneo.coronar(torneoId, null);
    io?.emit('torneo:actualizado', { torneoId });
    return;
  }

  if (vivos.length === 1) {
    await coronar(torneo, vivos[0]);
    return;
  }

  // Si alguien quedo esperando en una mesa que todavia no termino, no se
  // empareja de nuevo: la ronda sigue en juego.
  const hayMesasVivas = [...esperando.values()].some((e) => e.torneoId === torneoId)
    || [...roomManager.rooms.values()].some((s) => s.torneoId === torneoId && s.started && s.game?.status !== 'game-over');
  if (hayMesasVivas) return;

  const ronda = Math.max(...vivos.map((v) => v.ronda)) + 1;

  // Numero impar: el ultimo pasa de arriba, sin jugar.
  const pasanDeArriba = vivos.length % 2 === 1 ? vivos[vivos.length - 1] : null;
  const emparejables = pasanDeArriba ? vivos.slice(0, -1) : vivos;

  for (let i = 0; i < emparejables.length; i += 2) {
    const a = emparejables[i];
    const b = emparejables[i + 1];
    await Torneo.pasarDeRonda(torneoId, a.userId, ronda);
    await Torneo.pasarDeRonda(torneoId, b.userId, ronda);
    await armarMesa(torneo, a.userId, a.username, b.userId, b.username);
  }

  if (pasanDeArriba) {
    await Torneo.pasarDeRonda(torneoId, pasanDeArriba.userId, ronda);
    await avisar(pasanDeArriba.userId, {
      tipo: TIPO.TORNEO,
      titulo: `${torneo.nombre}: pasás de ronda`,
      cuerpo: 'Esta vuelta te tocó descansar. Esperá tu próxima mesa.',
      datos: { torneoId }
    });
  }

  io?.emit('torneo:actualizado', { torneoId });
}

async function coronar(torneo, campeon) {
  await Torneo.coronar(torneo.id, campeon.userId);
  const premio = await Ranking.sumarPuntos(campeon.userId, torneo.premioPuntos);

  await avisar(campeon.userId, {
    tipo: TIPO.TORNEO,
    titulo: `¡Ganaste ${torneo.nombre}!`,
    cuerpo: `+${torneo.premioPuntos} puntos y una copa para el palmarés.`,
    datos: { torneoId: torneo.id, puntos: premio.despues }
  });

  io?.emit('torneo:campeon', {
    torneoId: torneo.id,
    torneo: torneo.nombre,
    campeon: campeon.username,
    premioPuntos: torneo.premioPuntos
  });
}

/** Lo llama RoomManager cuando termina una partida de torneo. */
export const alTerminarPartida = async (sala, ganadorId, perdedorId) => {
  if (!sala?.torneoId) return;

  esperando.delete(sala.code);

  try {
    if (perdedorId != null) await Torneo.eliminar(sala.torneoId, perdedorId);
    if (ganadorId != null) {
      await avisar(ganadorId, {
        tipo: TIPO.TORNEO,
        titulo: 'Ganaste tu mesa',
        cuerpo: 'Seguís en el torneo. Esperá la próxima.',
        datos: { torneoId: sala.torneoId }
      });
    }
    await seguirLaLlave(sala.torneoId);
  } catch (err) {
    console.error('Error siguiendo la llave del torneo:', err.message);
  }
};

/** Arranca los torneos a los que ya les llego la hora. */
export const arrancarLosQueTocan = async () => {
  const listos = await Torneo.paraArrancar(new Date().toISOString());

  for (const torneo of listos) {
    const anotados = await Torneo.enPie(torneo.id);

    if (anotados.length < MINIMO) {
      await Torneo.cambiarEstado(torneo.id, Torneo.ESTADO.CANCELADO);
      for (const a of anotados) {
        await avisar(a.userId, {
          tipo: TIPO.TORNEO,
          titulo: `${torneo.nombre} no se jugó`,
          cuerpo: 'No se anotó suficiente gente. Probá con el próximo.',
          datos: { torneoId: torneo.id }
        });
      }
      continue;
    }

    await Torneo.cambiarEstado(torneo.id, Torneo.ESTADO.JUGANDO);
    await seguirLaLlave(torneo.id);
  }
};

/** Enciende el reloj que programa y arranca los torneos. */
export const encender = (servidorIo, manager) => {
  io = servidorIo;
  roomManager = manager;

  const tic = async () => {
    try {
      await programar();
      await arrancarLosQueTocan();
    } catch (err) {
      console.error('Error en el reloj de torneos:', err.message);
    }
  };

  tic();
  latido = setInterval(tic, LATIDO_MS);
  latido.unref?.();
};

export const apagar = () => {
  if (latido) clearInterval(latido);
  latido = null;
  for (const e of esperando.values()) clearTimeout(e.reloj);
  esperando.clear();
};

/** Para las pruebas: dejar el servicio listo sin encender el reloj. */
export const conectar = (servidorIo, manager) => {
  io = servidorIo;
  roomManager = manager;
};
