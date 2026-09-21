/**
 * EL SALON — el filtro y el castigo (seccion 196). Copiado del truco, que ya
 * lo tiene probado en vivo con plata en la mesa.
 *
 * Todo lo de aqui es PURO: la decision de que se tapa y que se rechaza se
 * prueba sin levantar nada.
 *
 * TRES COSAS SE FILTRAN, y la mas importante NO son las groserias:
 *
 *   1. ENLACES Y CONTACTOS. Cuando haya dinero en la mesa, el chat abierto es
 *      el canal natural del estafador ("escribeme al WhatsApp que te vendo
 *      fichas mas baratas"). Se quitan enlaces, correos y numeros de telefono.
 *      Una groseria ofende; un enlace le vacia la cuenta a alguien.
 *   2. GROSERIAS: se tapan con asteriscos, no se rechaza el mensaje. Rechazarlo
 *      ensena a esquivar el filtro; taparlo deja al que insulta en ridiculo
 *      delante de la sala, que funciona mejor.
 *   3. SPAM: repetir, escribir muy seguido, o gritar en mayusculas.
 */

/**
 * Groserias en venezolano y en espanol neutro. La lista es CORTA a proposito:
 * una lista larga tapa palabras normales ("concha" de un molusco, "verga" que
 * en Venezuela es hasta una muletilla carinosa) y termina censurando a gente
 * que no esta insultando a nadie. Se tapa lo que es agresion clara.
 */
const GROSERIAS = [
  'malparido', 'hijueputa', 'hijoeputa', 'hdp', 'mierda', 'pendejo', 'pendeja',
  'marico', 'maricon', 'maricón', 'puta', 'puto', 'coño', 'cono e madre', 'carajo',
  'imbecil', 'imbécil', 'estupido', 'estúpido', 'idiota', 'gonorrea', 'cabron',
  'cabrón', 'perra', 'zorra', 'culero', 'mamaguevo', 'mamahuevo', 'mamaguebo'
];

/** Quita tildes y baja a minusculas, para que "MARICÓN" y "maricon" sean lo mismo. */
const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Enlaces, correos y telefonos. Deliberadamente ancho: es preferible tapar de
 * mas un "3x4" que dejar pasar un "pasame 0414-1234567".
 */
const ENLACES =
  /(https?:\/\/\S+|www\.\S+|\b[\w.-]+\.(com|net|org|ve|co|me|link|xyz|app)\b\S*|\b[\w.-]+@[\w.-]+\.\w+\b|\+?\d[\d\s().-]{7,}\d)/gi;

/**
 * Limpia un mensaje. NUNCA rechaza por contenido: devuelve la version que se
 * puede mostrar. El rechazo es solo por spam (ver `esSpam`).
 *
 * @returns {{ visible: string, tapoGroserias: boolean, quitoContacto: boolean }}
 */
export function limpiar(texto) {
  let quitoContacto = false;
  let visible = texto.replace(ENLACES, () => {
    quitoContacto = true;
    return '[enlace quitado]';
  });

  let tapoGroserias = false;
  const plano = normalizar(visible);
  for (const mala of GROSERIAS) {
    let desde = 0;
    for (;;) {
      const i = plano.indexOf(mala, desde);
      if (i === -1) break;
      // Solo palabra entera: si no, "puta" taparia "diputado".
      const antes = i === 0 ? ' ' : plano[i - 1];
      const despues = plano[i + mala.length] ?? ' ';
      if (!/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(despues)) {
        tapoGroserias = true;
        visible = visible.slice(0, i) + '*'.repeat(mala.length) + visible.slice(i + mala.length);
      }
      desde = i + mala.length;
    }
  }

  // Gritar: si es largo y casi todo mayusculas, se baja el tono en vez de
  // rechazarlo. Nadie merece un silencio por escribir con Bloq Mayus puesto.
  const letras = visible.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '');
  if (letras.length >= 12) {
    const mayus = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
    if (mayus / letras.length > 0.8) visible = visible.toLowerCase();
  }

  return { visible: visible.trim(), tapoGroserias, quitoContacto };
}

/** Cuantos mensajes puede mandar en la ventana antes de que sea spam. */
export const MAX_EN_VENTANA = 5;
export const VENTANA_MS = 10_000;

/**
 * ¿Esto es spam? Dos senales, las dos baratas de calcular:
 *   - muchos mensajes en poco tiempo,
 *   - el mismo mensaje repetido (aunque cambie mayusculas o espacios).
 *
 * @param {string} texto
 * @param {{ tiempos: number[], textos: string[] }} historial del mas nuevo al mas viejo
 * @returns {'muy_seguido'|'repetido'|null}
 */
export function esSpam(texto, historial, ahora = Date.now()) {
  const enVentana = historial.tiempos.filter((t) => ahora - t < VENTANA_MS);
  if (enVentana.length >= MAX_EN_VENTANA) return 'muy_seguido';

  const plano = normalizar(texto).replace(/\s+/g, ' ').trim();
  // Repetir una vez es humano (se manda dos veces por nervios); tres seguidas
  // ya es machacar.
  const iguales = historial.textos
    .slice(0, 2)
    .filter((t) => normalizar(t).replace(/\s+/g, ' ').trim() === plano);
  if (iguales.length >= 2) return 'repetido';

  return null;
}

/** Primer silencio: 2 minutos (Raul). Reincidir duplica, con techo de un dia. */
export const SILENCIO_BASE_MS = 2 * 60_000;
const SILENCIO_TECHO_MS = 24 * 60 * 60_000;

/**
 * Cuanto dura el silencio numero `veces`. Escala porque un castigo fijo de 2
 * minutos le sale barato al que vino a molestar: vuelve y sigue.
 */
export function duracionSilencio(veces) {
  const n = Math.max(1, veces);
  return Math.min(SILENCIO_BASE_MS * 2 ** (n - 1), SILENCIO_TECHO_MS);
}

/** Como se le dice al jugador cuanto le falta, sin jerga. */
export function faltaEnPalabras(ms) {
  const seg = Math.ceil(ms / 1000);
  if (seg < 60) return `${seg} segundos`;
  const min = Math.ceil(seg / 60);
  if (min < 60) return `${min} minuto${min === 1 ? '' : 's'}`;
  const h = Math.ceil(min / 60);
  if (h < 48) return `${h} hora${h === 1 ? '' : 's'}`;
  const d = Math.ceil(h / 24);
  return `${d} día${d === 1 ? '' : 's'}`;
}
