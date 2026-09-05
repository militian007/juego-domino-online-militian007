// Prepara el icono de la app en los tres tamanos que hacen falta.
//
//   npm run icono
//
// Entra:  arte-fuente/icono-app.png
// Sale:   public/icono-192.png, icono-512.png, icono-maskable-512.png
//
// El dibujo lo genero Jonathan con Gemini: las dos fichas negras con marco
// dorado sobre el paño verde. Antes el icono se dibujaba aqui con circulos, y
// despues se armaba pegando las fichas del juego; las dos versiones quedaron
// atras en cuanto hubo arte de verdad.
import fs from 'node:fs';
import path from 'node:path';
import { leer, escalar, aPng } from './imagen.mjs';

const RAIZ = process.cwd();
const ORIGEN = path.join(RAIZ, 'arte-fuente', 'icono-app.png');
const SALIDA = path.join(RAIZ, 'public');

/**
 * Cuanto se encoge el dibujo en la version "maskable".
 *
 * El sistema operativo recorta ese icono con SU forma —un circulo en Android,
 * un cuadrado redondeado en otros— y se lleva las esquinas. Con el dibujo a
 * tamano completo, las puntas de las fichas quedan cortadas. Encogiendolo al
 * 78%, el recorte cae sobre el paño y no sobre las fichas.
 */
const ENCOGIDO_MASKABLE = 0.78;

/**
 * Encoge el dibujo dentro del cuadrado y rellena el borde **estirando el propio
 * dibujo** hacia afuera.
 *
 * La otra opcion era rellenar con un verde plano, y se probo: no sirve. El paño
 * del dibujo tiene viñeta, va del (22,94,60) en el medio del lado izquierdo al
 * (0,12,8) en la esquina, asi que cualquier color unico se nota como un marco
 * pegado. Estirando el borde, el relleno continua el mismo degradado y no se ve
 * el empalme.
 */
function encogerConBordeExtendido(img, lado, factor) {
  const salida = { ancho: lado, alto: lado, px: new Uint8Array(lado * lado * 4) };
  const dentro = lado * factor;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      // Del pixel de destino al de origen, y si cae fuera se pega al borde.
      let u = ((x - lado / 2) / dentro) * img.ancho + img.ancho / 2;
      let v = ((y - lado / 2) / dentro) * img.alto + img.alto / 2;
      u = Math.max(0, Math.min(img.ancho - 1.001, u));
      v = Math.max(0, Math.min(img.alto - 1.001, v));

      const x0 = Math.floor(u), y0 = Math.floor(v);
      const fx = u - x0, fy = v - y0;
      const d = (y * lado + x) * 4;

      for (let c = 0; c < 4; c++) {
        const a = img.px[(y0 * img.ancho + x0) * 4 + c];
        const b = img.px[(y0 * img.ancho + x0 + 1) * 4 + c];
        const e = img.px[((y0 + 1) * img.ancho + x0) * 4 + c];
        const f = img.px[((y0 + 1) * img.ancho + x0 + 1) * 4 + c];
        salida.px[d + c] = Math.round(
          (a * (1 - fx) + b * fx) * (1 - fy) + (e * (1 - fx) + f * fx) * fy
        );
      }
      salida.px[d + 3] = 255;
    }
  }
  return salida;
}

function escribir(nombre, img) {
  const buf = aPng(img);
  fs.writeFileSync(path.join(SALIDA, nombre), buf);
  console.log(`  ${nombre.padEnd(26)} ${img.ancho}x${img.alto}  ${(buf.length / 1024).toFixed(1)} KB`);
}

function main() {
  if (!fs.existsSync(ORIGEN)) {
    console.error('Falta arte-fuente/icono-app.png');
    process.exit(1);
  }

  const arte = leer(ORIGEN);

  console.log('');
  console.log(`  origen ${arte.ancho}x${arte.alto}`);
  console.log('');

  escribir('icono-192.png', escalar(arte, 192, 192));
  escribir('icono-512.png', escalar(arte, 512, 512));

  escribir('icono-maskable-512.png', encogerConBordeExtendido(arte, 512, ENCOGIDO_MASKABLE));

  console.log('');
}

main();
