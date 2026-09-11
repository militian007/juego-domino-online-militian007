// Utility to synthesize domino game sound effects using Web Audio API
// This avoids network delay and ensures 100% offline-ready sounds

let audioCtx = null;

// El silencio se recuerda entre partidas: si alguien juega sin sonido, no
// quiere que vuelva solo la proxima vez.
const LLAVE = 'domino-silencio';
let silenciado = false;
try {
  silenciado = localStorage.getItem(LLAVE) === '1';
} catch {
  // Navegador sin almacenamiento: se juega con sonido y listo.
}

export function estaSilenciado() {
  return silenciado;
}

export function alternarSilencio() {
  silenciado = !silenciado;
  try {
    localStorage.setItem(LLAVE, silenciado ? '1' : '0');
  } catch {
    // ignorado
  }
  return silenciado;
}

function getAudioContext() {
  if (silenciado) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume context if suspended (browser autoplay policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * EL CLAC DE LA FICHA (§124)
 *
 * Son **grabaciones de verdad**, no sonidos fabricados. Origen y licencia en
 * `frontend/public/sonidos/LEEME.md`: CC0 (dominio publico), del pack de madera
 * y metal de rubberduck en OpenGameArt. Jonathan eligio cual, de oido, entre
 * cuatro candidatos.
 *
 * ## Por que una grabacion
 *
 * Hubo un intento de fabricarlo con osciladores, ajustado contra el espectro
 * medido del video de Domino Legends. Daba las MISMAS bandas de energia
 * (13/18/56/12 contra su 13/18/57/12) y **sonaba peor**. Jonathan: *"se escucha
 * horrible... no entiendo por que el afan de querer inventar la rueda"*. Tenia
 * razon: dar los mismos numeros no es sonar igual.
 *
 * La medicion no se tiro: sirvio para ELEGIR. De los 25 golpes CC0 del pack,
 * este es el que mas se acerca al del video con la misma vara.
 *
 * **El audio del video de ellos no se usa nunca.** Es su grabacion.
 *
 * ## Y nunca suena igual dos veces
 *
 * Cada golpe mueve el tono y el volumen un poco. Dos fichas de verdad nunca
 * chocan igual, y una muestra repetida identica se nota a la tercera jugada.
 */

const ARCHIVO_CLAC = '/sonidos/clac.wav';

/**
 * El pozo revuelto usa OTRA grabacion, corta y seca.
 *
 * Antes usaba la misma del clac, veintitantas veces con el tono muy movido.
 * Jonathan lo escucho: *"suena raro el final ese corrido"*. Tenia razon y se
 * entiende por que: el clac dura 260 ms, y veinte colas de 260 ms encimadas no
 * suenan a monton de fichas, suenan a un barrido. Esta dura 80 ms.
 */
const ARCHIVO_POZO = '/sonidos/clac-pozo.wav';

/**
 * El volumen del clac. **Este es el numero que se toca para subirlo o bajarlo.**
 * 1 = como vino la grabacion. 1,12 es aproximadamente un decibel mas.
 */
export const VOLUMEN_CLAC = 1;

/** Cuanto se le mueve el tono a cada golpe, para que no haya dos iguales. */
const VARIACION_TONO = 0.08;

let muestraClac = null;
let muestraPozo = null;
let cargando = null;

/**
 * Trae la grabacion y la deja lista. Se pide UNA vez y se guarda.
 *
 * Mientras no este, `playTileSound` no hace nada: son 16 KB, llegan en el primer
 * momento de la partida, y un clac que llega tarde es peor que ninguno.
 */
function cargarClac(ctx) {
  if (muestraClac || cargando) return cargando;

  const traer = (url) =>
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((datos) => ctx.decodeAudioData(datos));

  cargando = Promise.all([traer(ARCHIVO_CLAC), traer(ARCHIVO_POZO)])
    .then(([clac, pozo]) => {
      muestraClac = clac;
      muestraPozo = pozo;
      return clac;
    })
    .catch(() => {
      // Sin sonido antes que con un error: el juego se juega igual.
      cargando = null;
      return null;
    });
  return cargando;
}

/**
 * Arma un golpe en el grafo que se le pase.
 *
 * Recibe el contexto y el momento en vez de usar los suyos para que el
 * revoltijo del pozo pueda programar veintitantos golpes de una sola vez, sin
 * depender de que la pantalla vaya fluida.
 */
export function armarClac(ctx, destino, cuando, { volumen = 1, tono = 1, pozo = false } = {}) {
  const muestra = pozo ? muestraPozo : muestraClac;
  if (!muestra) return;
  const fuente = ctx.createBufferSource();
  fuente.buffer = muestra;
  // El tono se mueve cambiando la velocidad, que es lo que pasa de verdad
  // cuando la ficha que golpea es un poco mas chica o mas grande.
  fuente.playbackRate.value = tono;
  const gain = ctx.createGain();
  gain.gain.value = volumen * VOLUMEN_CLAC;
  fuente.connect(gain);
  gain.connect(destino);
  fuente.start(cuando);
}

/** El clac de una ficha al ponerse en la mesa. */
export function playTileSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (!muestraClac) {
    cargarClac(ctx);
    return;
  }
  armarClac(ctx, ctx.destination, ctx.currentTime, {
    tono: 1 + (Math.random() - 0.5) * 2 * VARIACION_TONO,
    volumen: 0.85 + Math.random() * 0.3
  });
}

/** Se llama al entrar a la mesa, para que el primer clac no llegue tarde. */
export function prepararSonidos() {
  const ctx = getAudioContext();
  if (ctx) cargarClac(ctx);
}

/**
 * Plays a card/tile sliding draw sound
 */
export function playDrawSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Sine sliding from lower pitch to slightly higher, resembling pulling a tile
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(450, now + 0.16);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  // Bandpass filter to make it sound more like friction/paper sliding
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 1.0;

  // Re-route connection through filter
  osc.disconnect();
  osc.connect(filter);
  filter.connect(gain);

  osc.start(now);
  osc.stop(now + 0.17);
}

/**
 * El revoltijo del pozo: muchas fichas chocando entre si.
 *
 * No es un sonido nuevo: es el MISMO clac, repetido muchas veces con el tono y
 * el volumen movidos, que es exactamente lo que se oye cuando uno revuelve el
 * pozo con las manos. Se programan todos los golpes de una en el reloj del
 * audio, asi que no dependen de que la pantalla vaya fluida.
 *
 * @param duracionMs cuanto dura el revoltijo. Se reparten los golpes ahi dentro.
 */
export function playShuffleSound(duracionMs = 800) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (!muestraPozo) {
    cargarClac(ctx);
    return;
  }

  const inicio = ctx.currentTime;
  const segundos = duracionMs / 1000;
  // Un golpe cada 47 milisegundos mas o menos: suena a monton, no a goteo. Era
  // cada 35 y quedaban demasiado encimados.
  const golpes = Math.max(6, Math.round(segundos / 0.047));

  for (let i = 0; i < golpes; i++) {
    // El momento se corre al azar dentro de su hueco para que no suene a metronomo.
    const cuando = inicio + (i / golpes) * segundos + Math.random() * 0.03;
    armarClac(ctx, ctx.destination, cuando, {
      // Abanico de tonos corto. Con el de antes —de 0,82 a 1,32— los golpes
      // subian y bajaban tanto que se oian como un barrido, no como fichas.
      tono: 0.92 + Math.random() * 0.26,
      volumen: 0.25 + Math.random() * 0.18,
      pozo: true
    });
  }
}
