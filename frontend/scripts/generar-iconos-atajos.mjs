// Deja listos los iconos de TORNEOS y TABLA para la barra del menu.
//
//   npm run iconos-atajos
//
// Entra:  arte-fuente/icono-torneos.png   (la copa)
//         arte-fuente/icono-tabla.png     (el podio)
// Sale:   public/iconos/torneos.png y public/iconos/tabla.png
//
// Los genero Jonathan con Gemini. Vienen como JPEG aunque digan .png, y con el
// cuadriculado de "transparencia" pintado dentro: este script lo recorta, deja
// solo el dibujo y lo achica al tamano en que se usa.
//
// Se achican aqui y no con CSS porque una imagen de dos mil pixeles metida en un
// hueco de veintidos pesa dos megas para nada y tarda en cargar.
import fs from 'node:fs';
import path from 'node:path';
import { leer, quitarElFondo, recortar, escalar, aPng } from './imagen.mjs';

const RAIZ = process.cwd();
const FUENTE = path.join(RAIZ, 'arte-fuente');
const SALIDA = path.join(RAIZ, 'public', 'iconos');

/**
 * El lado del icono guardado.
 *
 * En pantalla se ve a 22 pixeles. Se guarda a 128 para que en un telefono de
 * pantalla fina siga viendose nitido, y aun asi pesa poquisimo.
 */
const LADO = 128;

const ICONOS = [
  { origen: 'icono-torneos.png', destino: 'torneos.png' },
  { origen: 'icono-tabla.png', destino: 'tabla.png' }
];

/** Encaja el dibujo dentro del cuadrado sin deformarlo. */
function encajar(img, lado) {
  const escala = Math.min(lado / img.ancho, lado / img.alto);
  const ancho = Math.max(1, Math.round(img.ancho * escala));
  const alto = Math.max(1, Math.round(img.alto * escala));
  const chico = escalar(img, ancho, alto);

  const cuadro = { ancho: lado, alto: lado, px: new Uint8Array(lado * lado * 4) };
  const izquierda = Math.round((lado - ancho) / 2);
  const arriba = Math.round((lado - alto) / 2);

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const o = (y * ancho + x) * 4;
      const d = ((arriba + y) * lado + (izquierda + x)) * 4;
      for (let c = 0; c < 4; c++) cuadro.px[d + c] = chico.px[o + c];
    }
  }
  return cuadro;
}

function main() {
  const faltan = ICONOS.filter((i) => !fs.existsSync(path.join(FUENTE, i.origen)));
  if (faltan.length) {
    console.error('Faltan en arte-fuente/: ' + faltan.map((i) => i.origen).join(', '));
    process.exit(1);
  }

  fs.mkdirSync(SALIDA, { recursive: true });
  console.log('');

  for (const { origen, destino } of ICONOS) {
    // `porTodaLaImagen` borra el gris este donde este, no solo el que se toca
    // con el borde. Hace falta por el fondo que queda ATRAPADO dentro del aro
    // de las asas de la copa: ahi el relleno desde el borde no llega y quedaba
    // una mancha clara.
    //
    // Es seguro porque el dorado nunca se acerca al gris: medido, no baja de
    // dif 70, y el corte esta en 16.
    //
    // Sin limite de brillo: el dibujo lleva contornos marron muy oscuros.
    const img = recortar(
      quitarElFondo(leer(path.join(FUENTE, origen)), { difMax: 16, porTodaLaImagen: true })
    );
    const buf = aPng(encajar(img, LADO));
    fs.writeFileSync(path.join(SALIDA, destino), buf);
    console.log(`  ${destino.padEnd(14)} ${LADO}x${LADO}  ${(buf.length / 1024).toFixed(1)} KB   (origen ${img.ancho}x${img.alto})`);
  }

  console.log('');
}

main();
