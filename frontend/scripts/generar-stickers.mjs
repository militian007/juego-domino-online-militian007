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
import { leer, quitarElFondoPorColor, recortar, escalar, aPng } from './imagen.mjs';

const RAIZ = process.cwd();
const FUENTE = path.join(RAIZ, 'arte-fuente');
const SALIDA = path.join(RAIZ, 'public', 'stickers');

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

/** El ancho del banner ya listo. La imagen de origen es enorme y no hace falta. */
const ANCHO_BANNER = 1200;

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

/** Recorta el magenta, deja solo el dibujo y lo baja al tamano en que se usa. */
function prepararSticker(origen) {
  const limpio = recortar(quitarElFondoPorColor(leer(origen)));
  const ancho = Math.max(1, Math.round((limpio.ancho / limpio.alto) * ALTO));
  return escalar(limpio, ancho, ALTO);
}

function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  console.log('');

  let hechos = 0;
  for (const id of [...STICKERS, 'panita']) {
    const origen = path.join(FUENTE, id === 'panita' ? 'panita.png' : `sticker-${id}.png`);
    if (!fs.existsSync(origen)) {
      console.log(`  ${id.padEnd(10)} falta ${path.basename(origen)}`);
      continue;
    }

    const img = prepararSticker(origen);
    const peso = guardar(path.join(SALIDA, `${id}.png`), img);
    console.log(`  ${id.padEnd(10)} ${img.ancho}x${img.alto}  ${(peso / 1024).toFixed(1)} KB`);
    hechos++;
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
    console.log(`  ${'banner'.padEnd(10)} ${ANCHO_BANNER}x${alto}  ${(data.length / 1024).toFixed(1)} KB`);
  } else {
    console.log('  banner     falta pase-banner.png');
  }

  console.log('');
  console.log(`  ${hechos} de ${STICKERS.length + 1} listos`);
  console.log('');
}

main();
