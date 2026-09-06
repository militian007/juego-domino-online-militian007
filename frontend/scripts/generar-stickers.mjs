// Deja listos los stickers del pase y el banner de su pantalla.
//
//   npm run stickers
//
// Entra:  arte-fuente/sticker-<id>.png   (uno por sticker, fondo magenta)
//         arte-fuente/panita.png         (la mascota, para la pantalla del pase)
//         arte-fuente/pase-banner.png    (la cabecera, esta no lleva magenta)
// Sale:   public/stickers/<id>.png, public/stickers/panita.png
//         public/pase-banner.png
//
// ## Por que el fondo es magenta y no el cuadriculado de siempre
//
// Los otros dibujos se recortan buscando gris neutro. Con los stickers eso no
// sirve: llevan un contorno CREMA, que es casi neutro, y el recorte se lo
// comeria. Por eso se le pide a Gemini un fondo magenta puro, que no aparece en
// ninguna parte del dibujo, y se borra por color.
//
// Medido sobre el primer sticker: el fondo queda a distancia menor de 60 del
// magenta y lo mas cercano del dibujo esta a mas de 120. El corte en 90 cae en
// el medio de ese hueco.
import fs from 'node:fs';
import path from 'node:path';
import jpeg from 'jpeg-js';
import { leer, quitarElFondoPorColor, recortar, escalar, desenfocar, aPng } from './imagen.mjs';

const RAIZ = process.cwd();
const FUENTE = path.join(RAIZ, 'arte-fuente');
const SALIDA = path.join(RAIZ, 'public', 'stickers');
const SALIDA_ICONOS = path.join(RAIZ, 'public', 'iconos');

/**
 * El alto al que se guardan.
 *
 * En el menu de la mesa se ven a unos 30 o 40 pixeles, y flotando sobre la mesa
 * a unos 60. Se guardan a 192 para que en un telefono de pantalla fina se sigan
 * viendo nitidos, y aun asi pesan poco.
 */
const ALTO = 192;

/** Los siete del pase, con el mismo id que usa el servidor en `sticker:<id>`. */
const STICKERS = ['candela', 'corona', 'suerte', 'chivo', 'cerebro', 'respeto', 'diamante'];

/**
 * Cuanto del dibujo se queda: la franja de ARRIBA.
 *
 * Los dibujos vienen de cuerpo entero, y de cuerpo entero no sirven. Se probo:
 * bajados a los 44 pixeles en que se ven en el menu de la mesa, la cara queda
 * en una mancha oscura y los seis se parecen entre si. Quedandose con la franja
 * de arriba, la cara ocupa el sticker y cada uno se distingue del otro.
 *
 * El numero sale de comparar 0,45 / 0,55 / 0,62 / 0,70 sobre los seis: con 0,45
 * se corta la boca, con 0,70 la cara vuelve a achicarse. 0,58 deja la cara
 * entera y todavia grande.
 *
 * El resto del dibujo no se pierde: el de cuerpo entero es el del banner.
 */
const FRANJA_DE_ARRIBA = 0.58;

/**
 * Los iconos de los menus. Mismo tratamiento que los stickers —magenta y
 * recorte a la cara— porque en las tarjetas se ven igual de chiquitos.
 */
const ICONOS = ['modo-casa', 'modo-gente', 'busqueda-rapida', 'sala-privada', 'esperando'];

/** El ancho del banner ya listo. La imagen de origen es enorme y no hace falta. */
const ANCHO_BANNER = 1200;

/**
 * El fondo de los menus.
 *
 * Va en JPEG y no en PNG por lo mismo que el banner: es una escena con
 * degradados, y en PNG pesa varios megas. Y se guarda a 900 de ancho porque es
 * un fondo desenfocado detras del contenido, no algo que nadie mire de cerca.
 */
const ANCHO_FONDO = 900;

/**
 * Cuanto se desenfoca el fondo.
 *
 * No es solo estetica. Gemini pinto la franja oscura del medio como un
 * rectangulo, con dos bordes verticales duros que en pantalla se veian como una
 * raya. Con este desenfoque el escalon se derrite y parece una sombra, y de
 * paso el texto de encima se lee mejor.
 */
const DESENFOQUE_FONDO = 7;

/**
 * El banner sale en JPEG y no en PNG.
 *
 * Es una escena con degradados y foco: en PNG pesaba 913 KB, que en un telefono
 * con mala señal es una cabecera que tarda en aparecer. En JPEG al 82 pesa una
 * fraccion y no se nota la diferencia. Los stickers si van en PNG, porque
 * necesitan el fondo transparente.
 */
const CALIDAD_BANNER = 82;

function guardar(destino, img) {
  const buf = aPng(img);
  fs.writeFileSync(destino, buf);
  return buf.length;
}

/** Recorta el magenta, se queda con la cara y lo baja al tamano en que se usa. */
function prepararSticker(origen, soloLaCara = true) {
  const limpio = recortar(quitarElFondoPorColor(leer(origen)));

  let util = limpio;
  if (soloLaCara) {
    const alto = Math.max(1, Math.round(limpio.alto * FRANJA_DE_ARRIBA));
    util = recortar({ ancho: limpio.ancho, alto, px: limpio.px.slice(0, limpio.ancho * alto * 4) });
  }

  const ancho = Math.max(1, Math.round((util.ancho / util.alto) * ALTO));
  return escalar(util, ancho, ALTO);
}

function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  console.log('');

  let hechos = 0;
  for (const id of [...STICKERS, 'panita']) {
    const origen = path.join(FUENTE, id === 'panita' ? 'panita.png' : `sticker-${id}.png`);
    if (!fs.existsSync(origen)) {
      console.log(`  ${id.padEnd(16)} falta ${path.basename(origen)}`);
      continue;
    }

    // La mascota se guarda entera: se usa grande, no en el menu de la mesa.
    const img = prepararSticker(origen, id !== 'panita');
    const peso = guardar(path.join(SALIDA, `${id}.png`), img);
    console.log(`  ${id.padEnd(16)} ${img.ancho}x${img.alto}  ${(peso / 1024).toFixed(1)} KB`);
    hechos++;
  }

  // Los iconos de los menus.
  fs.mkdirSync(SALIDA_ICONOS, { recursive: true });
  for (const id of ICONOS) {
    const origen = path.join(FUENTE, `${id}.png`);
    if (!fs.existsSync(origen)) {
      console.log(`  ${id.padEnd(16)} falta ${id}.png`);
      continue;
    }
    const img = prepararSticker(origen);
    const peso = guardar(path.join(SALIDA_ICONOS, `${id}.png`), img);
    console.log(`  ${id.padEnd(16)} ${img.ancho}x${img.alto}  ${(peso / 1024).toFixed(1)} KB`);
  }

  // El fondo de los menus: escena entera, sin magenta.
  const fondo = path.join(FUENTE, 'fondo-menu.png');
  if (fs.existsSync(fondo)) {
    const arte = leer(fondo);
    const alto = Math.round((arte.alto / arte.ancho) * ANCHO_FONDO);
    const chico = desenfocar(escalar(arte, ANCHO_FONDO, alto), DESENFOQUE_FONDO);
    const { data } = jpeg.encode(
      { data: Buffer.from(chico.px), width: chico.ancho, height: chico.alto },
      78
    );
    fs.writeFileSync(path.join(RAIZ, 'public', 'fondo-menu.jpg'), data);
    console.log(`  ${'fondo'.padEnd(16)} ${ANCHO_FONDO}x${alto}  ${(data.length / 1024).toFixed(1)} KB`);
  } else {
    console.log('  fondo            falta fondo-menu.png');
  }

  // El banner no lleva magenta: es una escena entera, con su fondo.
  const banner = path.join(FUENTE, 'pase-banner.png');
  if (fs.existsSync(banner)) {
    const arte = leer(banner);
    const alto = Math.round((arte.alto / arte.ancho) * ANCHO_BANNER);
    const chico = escalar(arte, ANCHO_BANNER, alto);
    const { data } = jpeg.encode(
      { data: Buffer.from(chico.px), width: chico.ancho, height: chico.alto },
      CALIDAD_BANNER
    );
    fs.writeFileSync(path.join(RAIZ, 'public', 'pase-banner.jpg'), data);
    console.log(`  ${'banner'.padEnd(16)} ${ANCHO_BANNER}x${alto}  ${(data.length / 1024).toFixed(1)} KB`);
  } else {
    console.log('  banner     falta pase-banner.png');
  }

  console.log('');
  console.log(`  ${hechos} de ${STICKERS.length + 1} listos`);
  console.log('');
}

main();
