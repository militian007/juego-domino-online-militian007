import * as Config from '../models/Config.js';

/**
 * LOS GUARDIANES DE LA TANDA (seccion 201, ficha 3.3 de la plantilla).
 *
 * Cada vez que se publica algo grande hay que saber, sin estar mirando, si la
 * gente empezo a quejarse o si el chat se desordeno. Eso es esto: un termometro
 * que vive EN MEMORIA (se va con el reinicio, como en el truco) y que enciende
 * una alarma con su motivo y un pedazo de la evidencia.
 *
 * En el truco la alarma suena por campanita, push y Telegram. Aqui no hay staff
 * conectado ni canal de avisos todavia, asi que la alarma se GUARDA y el socio
 * la ve junto al buzon con su llave. Cuando el domino tenga por donde avisar,
 * se engancha en `encender()` y ya.
 *
 * Las palabras de la tanda y hasta cuando vigilar se cambian en cada entrega
 * (`PALABRAS_DE_LA_TANDA`): es lo que hace que «se me quedo pegado el reloj»
 * suene en el acto el dia que se toca el reloj.
 */

/** Lo que se acaba de tocar. Se cambia en cada tanda. */
export const PALABRAS_DE_LA_TANDA = ['chat', 'burbuja', 'reloj', 'buzón', 'buzon', 'mesa juega'];

/** Cada alarma descansa media hora: una tanda mala no manda cien avisos. */
const DESCANSO_MS = 30 * 60_000;
const VENTANA_CORTA_MS = 10 * 60_000;
const VENTANA_LARGA_MS = 30 * 60_000;

const TOPES = {
  groserias: 3,      // del mismo jugador, en 10 min
  contactos: 2,      // enlaces o telefonos del mismo, en 10 min
  silenciados: 3,    // jugadores distintos callados por spam, en 10 min
  ola: 150,          // mensajes de todos, en 10 min
  quejas: 3          // notas del buzon o tickets, en 30 min
};

/** Las alarmas encendidas, de la mas nueva a la mas vieja. */
const alarmas = [];
/** Cuando sono cada motivo por ultima vez. */
const ultimaVez = new Map();
/** Los hechos que se van contando. */
const hechos = { groserias: new Map(), contactos: new Map(), silenciados: [], mensajes: [], quejas: [] };

const podar = (lista, ventana) => {
  const desde = Date.now() - ventana;
  while (lista.length && lista[0].cuando < desde) lista.shift();
  return lista;
};

const podarMapa = (mapa, ventana) => {
  for (const [id, lista] of mapa) {
    podar(lista, ventana);
    if (lista.length === 0) mapa.delete(id);
  }
};

/** Numeros largos tapados: en la evidencia no viaja el telefono de nadie. */
const taparNumeros = (texto) => String(texto).replace(/\d{6,}/g, (n) => `${n.slice(0, 2)}…${n.slice(-2)}`);

function encender(motivo, titulo, detalle) {
  if (!Config.valor('guardianes.activo')) return null;
  const ahora = Date.now();
  if (ahora - (ultimaVez.get(motivo) ?? 0) < DESCANSO_MS) return null;
  ultimaVez.set(motivo, ahora);
  const alarma = { motivo, titulo: `Guardián · ${titulo}`, detalle: taparNumeros(detalle).slice(0, 300), cuando: new Date(ahora).toISOString() };
  alarmas.unshift(alarma);
  if (alarmas.length > 50) alarmas.length = 50;
  console.warn(`[guardián] ${alarma.titulo}: ${alarma.detalle}`);
  return alarma;
}

/**
 * Un mensaje paso por la moderacion (del salon o de la mesa).
 * `tapoGroserias` / `quitoContacto` vienen de `moderacionDelChat.js`.
 */
export function alModerar({ userId, username, texto, tapoGroserias, quitoContacto }) {
  if (!Config.valor('guardianes.activo')) return;
  const ahora = Date.now();

  hechos.mensajes.push({ cuando: ahora });
  podar(hechos.mensajes, VENTANA_CORTA_MS);
  if (hechos.mensajes.length >= TOPES.ola) {
    encender('ola', 'ola de mensajes', `${hechos.mensajes.length} mensajes en diez minutos.`);
  }

  if (tapoGroserias) {
    const lista = hechos.groserias.get(userId) ?? [];
    lista.push({ cuando: ahora, texto });
    hechos.groserias.set(userId, lista);
    podarMapa(hechos.groserias, VENTANA_CORTA_MS);
    const mias = hechos.groserias.get(userId) ?? [];
    if (mias.length >= TOPES.groserias) {
      encender(`groserias:${userId}`, 'alguien se está pasando', `${username} lleva ${mias.length} groserías tapadas en diez minutos. La última: «${mias[mias.length - 1].texto}».`);
    }
  }

  if (quitoContacto) {
    const lista = hechos.contactos.get(userId) ?? [];
    lista.push({ cuando: ahora, texto });
    hechos.contactos.set(userId, lista);
    podarMapa(hechos.contactos, VENTANA_CORTA_MS);
    const mios = hechos.contactos.get(userId) ?? [];
    if (mios.length >= TOPES.contactos) {
      encender(`contactos:${userId}`, 'están repartiendo contactos', `${username} intentó dejar ${mios.length} enlaces o teléfonos en diez minutos.`);
    }
  }
}

/** Se callo a alguien por spam. */
export function alSilenciar({ userId, username, motivo }) {
  if (!Config.valor('guardianes.activo')) return;
  hechos.silenciados.push({ cuando: Date.now(), userId, username });
  podar(hechos.silenciados, VENTANA_CORTA_MS);
  const distintos = new Set(hechos.silenciados.map((s) => s.userId));
  if (distintos.size >= TOPES.silenciados) {
    encender('silenciados', 'el salón se desordenó', `${distintos.size} jugadores callados por ${motivo || 'spam'} en diez minutos: ${[...distintos].length} distintos.`);
  }
}

/**
 * Cayo una nota al buzon (o un ticket, cuando los haya). Si menciona lo que se
 * acaba de tocar, suena EN EL ACTO con un pedazo del texto.
 */
export function alLlegarQueja({ tipo, username, texto }) {
  if (!Config.valor('guardianes.activo')) return;
  hechos.quejas.push({ cuando: Date.now(), texto });
  podar(hechos.quejas, VENTANA_LARGA_MS);

  const plano = String(texto).toLowerCase();
  const palabra = PALABRAS_DE_LA_TANDA.find((p) => plano.includes(p.toLowerCase()));
  if (palabra) {
    encender(`tanda:${palabra}`, `se quejan de «${palabra}»`, `${username} (${tipo}): «${texto}».`);
    return;
  }
  if (hechos.quejas.length >= TOPES.quejas) {
    encender('quejas', 'llegaron varias quejas', `${hechos.quejas.length} notas al buzón en media hora. La última: «${texto}».`);
  }
}

export const listar = () => alarmas.slice();

export function __limpiarParaPruebas() {
  alarmas.length = 0;
  ultimaVez.clear();
  hechos.groserias.clear();
  hechos.contactos.clear();
  hechos.silenciados.length = 0;
  hechos.mensajes.length = 0;
  hechos.quejas.length = 0;
}
