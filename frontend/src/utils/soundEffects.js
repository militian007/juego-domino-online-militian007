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
 * Jonathan: *"puede usar el audio de las fichas de ese juego se escucha mas
 * natural"*. El audio de ellos no se puede usar —es su grabacion—, pero si se
 * puede MEDIR por que suena natural y hacer uno propio que de los mismos
 * numeros. Eso es lo que hay aca.
 *
 * ## Lo que estaba mal antes
 *
 * El clac viejo eran dos osciladores: un triangulo de 950 Hz cayendo a 120 y
 * un seno de 2400 cayendo a 800. Medido, dejaba el **73% de la energia entre
 * 500 y 2000 Hz** — que es la banda del *bip*, no la del *clac*.
 *
 * ## Lo que dice el video de ellos
 *
 * Medidos 98 golpes del video (`ffmpeg` + analisis de transitorios):
 *
 * |                        | el viejo | ellos | este |
 * | ---------------------- | -------- | ----- | ---- |
 * | se apaga (-20 dB) en   | 30 ms    | 50 ms | 45 ms |
 * | centro espectral       | 1581 Hz  | 4359 Hz | 3997 Hz |
 * | planitud espectral     | 0,085    | 0,023 | 0,021 |
 * | energia < 500 Hz       | 10%      | 13%   | 14% |
 * | energia 500-2000 Hz    | **73%**  | 18%   | 18% |
 * | energia 2-8 kHz        | 14%      | **57%** | 56% |
 * | energia > 8 kHz        | 3%       | 12%   | 12% |
 *
 * La planitud es la clave: 0,023 quiere decir que su golpe esta hecho de picos
 * definidos, **no de ruido**. Una ficha dura no hace "shhk", hace "clac": suena
 * el cuerpo, con sus modos, y se apaga. Por eso esto no es un golpe de ruido
 * filtrado sino un modelo de modos, con un mordisco cortisimo de ruido al
 * principio para que tenga filo.
 *
 * ## Y nunca suena igual dos veces
 *
 * Cada golpe mueve el tono un poco al azar. Dos fichas de verdad nunca chocan
 * igual, y una muestra repetida identica se nota a la tercera jugada.
 */

/**
 * Los modos del cuerpo de la ficha: frecuencia, cuanto pesa, cuanto dura.
 *
 * Los marcados `basico` son los cuatro que se usan en el revoltijo del pozo,
 * donde suenan veintitantos golpes a la vez. **Estan elegidos uno por banda, no
 * son los cuatro primeros**: recortando por orden quedaban los cuatro agudos y
 * el monton sonaba a cascabeles, con el 99% de la energia arriba de 2 kHz.
 */
const MODOS = [
  // Los agudos, donde vive el 56% de la energia. Son los que hacen el "clac".
  { hz: 3100, peso: 1.0, ms: 46, basico: true },
  { hz: 4300, peso: 0.9, ms: 41, basico: true },
  { hz: 5600, peso: 0.7, ms: 35 },
  { hz: 6900, peso: 0.45, ms: 28 },
  // El brillo de arriba: es el filo del golpe.
  { hz: 9200, peso: 0.9, ms: 21 },
  { hz: 11800, peso: 0.54, ms: 16 },
  // El cuerpo medio.
  { hz: 980, peso: 0.45, ms: 55, basico: true },
  { hz: 1650, peso: 0.32, ms: 48 },
  // El peso, para que no suene a juguete.
  { hz: 185, peso: 0.7, ms: 41, basico: true }
];

/** Cuanto se le mueve el tono a cada golpe, para que no haya dos iguales. */
const VARIACION_TONO = 0.08;

/** El mordisco de ruido del impacto, contra el nivel del cuerpo. */
const FUERZA_DEL_MORDISCO = 0.8;

let bufferDeRuido = null;

function ruidoBlanco(ctx) {
  // Se hace UNA vez y se reusa: crear medio segundo de ruido en cada jugada es
  // trabajo tirado, y en el revoltijo del pozo son veintitantos golpes seguidos.
  if (bufferDeRuido && bufferDeRuido.sampleRate === ctx.sampleRate) return bufferDeRuido;
  const largo = Math.floor(ctx.sampleRate * 0.25);
  const buf = ctx.createBuffer(1, largo, ctx.sampleRate);
  const datos = buf.getChannelData(0);
  for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
  bufferDeRuido = buf;
  return buf;
}

/**
 * Arma el golpe en el grafo que se le pase.
 *
 * Recibe el contexto y el momento en vez de usar los suyos para poder
 * dibujarlo en un `OfflineAudioContext` y MEDIRLO: sin eso, los numeros de
 * arriba serian los del prototipo y no los de lo que suena de verdad.
 */
export function armarClac(ctx, destino, cuando, { volumen = 1, tono = 1, ligero = false } = {}) {
  // `exponentialRampToValueAtTime` a la milesima es una caida de 60 dB, o sea
  // tres veces el tiempo en el que cae los 20 dB que se midieron.
  const hasta = (ms) => cuando + (ms * 3) / 1000;

  for (const m of ligero ? MODOS.filter((x) => x.basico) : MODOS) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(m.hz * tono, cuando);
    const g0 = 0.16 * m.peso * volumen;
    gain.gain.setValueAtTime(g0, cuando);
    gain.gain.exponentialRampToValueAtTime(g0 * 0.001, hasta(m.ms));
    osc.connect(gain);
    gain.connect(destino);
    osc.start(cuando);
    osc.stop(hasta(m.ms) + 0.01);
  }

  // El mordisco: dos milisegundos de ruido por arriba de 3 kHz. Es lo que
  // separa un golpe de una nota.
  const fuente = ctx.createBufferSource();
  fuente.buffer = ruidoBlanco(ctx);
  const paso = ctx.createBiquadFilter();
  paso.type = 'highpass';
  paso.frequency.value = 3000;
  paso.Q.value = 0.7;
  const gr = ctx.createGain();
  const g0 = 0.16 * FUERZA_DEL_MORDISCO * volumen;
  gr.gain.setValueAtTime(g0, cuando);
  gr.gain.exponentialRampToValueAtTime(g0 * 0.001, hasta(2));
  fuente.connect(paso);
  paso.connect(gr);
  gr.connect(destino);
  fuente.start(cuando);
  fuente.stop(hasta(2) + 0.01);
}

/** El clac de una ficha al ponerse en la mesa. */
export function playTileSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  armarClac(ctx, ctx.destination, ctx.currentTime, {
    tono: 1 + (Math.random() - 0.5) * 2 * VARIACION_TONO,
    volumen: 0.85 + Math.random() * 0.3
  });
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
 * No es un sonido nuevo inventado: es el MISMO clac de una ficha, repetido
 * muchas veces con el tono y el volumen movidos, que es exactamente lo que se
 * oye cuando uno revuelve el pozo con las manos. Se programan todos los golpes
 * de una en el reloj del audio, asi que no dependen de que la pantalla vaya
 * fluida.
 *
 * Cada golpe usa cuatro modos en vez de los nueve. Son veintitantos golpes
 * seguidos: con el modelo entero serian mas de doscientos nodos de audio a la
 * vez, y en un telefono viejo eso se oye como un tironeo. En un monton de
 * fichas revueltas nadie distingue los modos de arriba.
 *
 * @param duracionMs cuanto dura el revoltijo. Se reparten los golpes ahi dentro.
 */
export function playShuffleSound(duracionMs = 800) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const inicio = ctx.currentTime;
  const segundos = duracionMs / 1000;
  // Un golpe cada 35 milisegundos mas o menos: suena a monton, no a goteo.
  const golpes = Math.max(6, Math.round(segundos / 0.035));

  for (let i = 0; i < golpes; i++) {
    // El momento se corre al azar dentro de su hueco para que no suene a metronomo.
    const cuando = inicio + (i / golpes) * segundos + Math.random() * 0.02;
    armarClac(ctx, ctx.destination, cuando, {
      tono: 0.82 + Math.random() * 0.5,
      volumen: 0.22 + Math.random() * 0.2,
      ligero: true
    });
  }
}
