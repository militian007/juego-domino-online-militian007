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
 * El volumen del monton revuelto, aparte del clac.
 *
 * Va aparte porque son dos sonidos distintos y Jonathan los pidio al reves: el
 * clac mas bajo y el revoltijo mas alto. Cada golpe del monton se mueve un poco
 * alrededor de este numero, para que no suenen todos iguales.
 */
export const VOLUMEN_POZO = 0.55;

/**
 * El volumen del clac. **Este es el numero que se toca para subirlo o bajarlo.**
 * 1 = como vino la grabacion. 1,12 es aproximadamente un decibel mas, 0,89 uno
 * menos. A pedido de Jonathan esta en 0,82: casi dos decibeles por debajo del
 * original, que es como lo queria.
 */
export const VOLUMEN_CLAC = 0.82;

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

/** Robar del pozo: ahora es un aviso mas de la familia elegida (ver abajo). */
export function playDrawSound() {
  sonar('robar');
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
      volumen: VOLUMEN_POZO * (0.8 + Math.random() * 0.4),
      pozo: true
    });
  }
}

/**
 * LOS AVISOS DE LA MESA
 *
 * Seis momentos que antes pasaban en silencio o con un sonido inventado con
 * osciladores: te toca, ronda ganada, ronda perdida, tranque, la ficha que no
 * va, y robar del pozo. Hay TRES familias para elegir, y la eleccion vive en
 * el navegador mientras se decide (`?sonidos=fichas|madera|club` en la URL, o
 * la pagina /sonidos). Cuando Raul elija una, las otras dos se van.
 *
 * - fichas: SOLO las grabaciones del clac y del pozo, repetidas y afinadas.
 *   Es la familia que sigue al pie la conclusion de la seccion 124: dar los
 *   mismos numeros no es sonar igual; lo grabado suena a ficha.
 * - madera: golpes secos de madera sintetizados, la misma familia que el Ludo
 *   de la casa (tac corto con caida de tono).
 * - club: campanitas suaves con dos parciales, discretas, de club y no de feria.
 */
const LLAVE_FAMILIA = 'domino-sonidos';
export const FAMILIAS = { fichas: 'Fichas', madera: 'Madera', club: 'Club' };
export const AVISOS = {
  teToca: 'Te toca',
  rondaGanada: 'Ronda ganada',
  rondaPerdida: 'Ronda perdida',
  tranque: 'Tranque',
  noVa: 'Esa ficha no va',
  robar: 'Robar del pozo'
};
const FAMILIA_POR_DEFECTO = 'fichas';

export function familiaElegida() {
  try {
    const pedida = new URLSearchParams(window.location.search).get('sonidos');
    if (pedida && FAMILIAS[pedida]) {
      localStorage.setItem(LLAVE_FAMILIA, pedida);
      return pedida;
    }
    const guardada = localStorage.getItem(LLAVE_FAMILIA);
    return FAMILIAS[guardada] ? guardada : FAMILIA_POR_DEFECTO;
  } catch {
    return FAMILIA_POR_DEFECTO;
  }
}

export function elegirFamilia(familia) {
  if (!FAMILIAS[familia]) return familiaElegida();
  try {
    localStorage.setItem(LLAVE_FAMILIA, familia);
  } catch {
    // sin almacenamiento se usa en memoria y listo
  }
  return familia;
}

/** Golpe seco de madera: seno que cae de tono mas un chasquido de ruido. */
function golpe(ctx, t, { tono = 1900, dur = 0.055, gana = 0.16 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(tono, t);
  o.frequency.exponentialRampToValueAtTime(tono * 0.45, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gana, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.01);
  ruido(ctx, t, { dur: 0.018, gana: gana * 0.9, hz: 3200 });
}

/** Un soplo de ruido filtrado: el chasquido del golpe o el roce de la ficha. */
function ruido(ctx, t, { dur = 0.05, gana = 0.1, hz = 1800, q = 1.2 } = {}) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = hz;
  filtro.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gana;
  fuente.connect(filtro);
  filtro.connect(g);
  g.connect(ctx.destination);
  fuente.start(t);
}

/** Campanita: fundamental mas un parcial agudo que muere antes. */
function campana(ctx, t, { hz = 880, dur = 0.55, gana = 0.14 } = {}) {
  const partes = [
    { mult: 1, gana: gana, dur },
    { mult: 2.76, gana: gana * 0.35, dur: dur * 0.45 }
  ];
  for (const p of partes) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz * p.mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p.gana, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + p.dur + 0.02);
  }
}

/** Un clac grabado, afinado. Si la grabacion no llego todavia, no suena. */
function clac(ctx, t, { tono = 1, volumen = 1, pozo = false } = {}) {
  armarClac(ctx, ctx.destination, t, { tono, volumen, pozo });
}

const DO5 = 523.25, MI5 = 659.25, SOL5 = 783.99, DO6 = 1046.5, LA3 = 220, MI4 = 329.63, DO4 = 261.63;

const RECETAS = {
  fichas: {
    teToca: (c, t) => clac(c, t, { tono: 1.3, volumen: 0.55 }),
    rondaGanada: (c, t) => {
      [0.95, 1.1, 1.3, 1.55].forEach((tono, i) => clac(c, t + i * 0.11, { tono, volumen: 0.8 + i * 0.05 }));
    },
    rondaPerdida: (c, t) => {
      clac(c, t, { tono: 0.72, volumen: 0.8 });
      clac(c, t + 0.26, { tono: 0.6, volumen: 0.7 });
    },
    tranque: (c, t) => [0, 0.15, 0.3].forEach((d) => clac(c, t + d, { tono: 0.8, volumen: 0.85 })),
    noVa: (c, t) => clac(c, t, { tono: 0.62, volumen: 0.6, pozo: true }),
    robar: (c, t) => {
      clac(c, t, { tono: 0.9, volumen: 0.75, pozo: true });
      clac(c, t + 0.06, { tono: 1.05, volumen: 0.55, pozo: true });
    }
  },
  madera: {
    teToca: (c, t) => golpe(c, t, { tono: 2100, gana: 0.12 }),
    rondaGanada: (c, t) => {
      [DO5, MI5, SOL5, DO6].forEach((hz, i) => golpe(c, t + i * 0.1, { tono: hz * 2.4, dur: 0.09, gana: 0.16 }));
    },
    rondaPerdida: (c, t) => {
      golpe(c, t, { tono: 900, dur: 0.12, gana: 0.16 });
      golpe(c, t + 0.28, { tono: 640, dur: 0.16, gana: 0.15 });
    },
    tranque: (c, t) => [0, 0.16, 0.32].forEach((d) => golpe(c, t + d, { tono: 760, dur: 0.1, gana: 0.17 })),
    noVa: (c, t) => golpe(c, t, { tono: 420, dur: 0.11, gana: 0.15 }),
    robar: (c, t) => [0, 0.05, 0.1].forEach((d, i) => golpe(c, t + d, { tono: 1500 + i * 250, dur: 0.045, gana: 0.09 }))
  },
  club: {
    teToca: (c, t) => campana(c, t, { hz: 880, dur: 0.5, gana: 0.11 }),
    rondaGanada: (c, t) => {
      [DO5, MI5, SOL5, DO6].forEach((hz, i) => campana(c, t + i * 0.13, { hz, dur: 0.9 - i * 0.1, gana: 0.12 }));
    },
    rondaPerdida: (c, t) => {
      campana(c, t, { hz: MI4, dur: 0.6, gana: 0.1 });
      campana(c, t + 0.32, { hz: DO4, dur: 0.8, gana: 0.1 });
    },
    tranque: (c, t) => [0, 0.2].forEach((d) => campana(c, t + d, { hz: LA3, dur: 0.35, gana: 0.13 })),
    noVa: (c, t) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.09);
      const g = c.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.11);
    },
    robar: (c, t) => ruido(c, t, { dur: 0.14, gana: 0.14, hz: 900, q: 0.8 })
  }
};

/**
 * Suena un aviso con la familia elegida (o una forzada, para la pagina de
 * escuchar). Todo va envuelto: el sonido jamas puede romper una jugada.
 */
export function sonar(aviso, familia = familiaElegida()) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const receta = RECETAS[familia]?.[aviso];
    if (!receta) return;
    if (familia === 'fichas' && !muestraClac) {
      cargarClac(ctx);
      return;
    }
    receta(ctx, ctx.currentTime + 0.005);
  } catch {
    // sin sonido antes que con un error
  }
}
