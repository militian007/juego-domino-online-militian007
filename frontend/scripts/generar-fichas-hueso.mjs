// Arma las 28 fichas blanco hueso a partir de DOS imagenes.
//
//   node scripts/generar-fichas-hueso.mjs
//
// Entra:  arte-fuente/hueso-ficha.png   (la ficha vacia)
//         arte-fuente/hueso-punto.png   (un punto)
// Sale:   public/tiles-hueso/tile_0_0.png ... tile_6_6.png
//
// ## Por que dos imagenes y no veintiocho
//
// Un modelo de imagen no cuenta bien los puntos: pidiendole las 28 fichas, la
// mitad sale con el numero equivocado. Se le pide el MATERIAL y la GEOMETRIA la
// pone este script. El arte sigue siendo profesional (regla de oro 1.1) y el
// numero de puntos siempre es el correcto.
//
// ## Las dos trampas de los archivos que devuelve Gemini
//
// 1. **Son JPEG, aunque digan .png.** JPEG no tiene canal alfa.
// 2. **El cuadriculado de "transparencia" viene PINTADO dentro de la imagen.**
//    No es transparencia: son cuadritos blancos y grises de verdad.
//
// Por eso hay que recortar el fondo aqui. Se hace por dos senas juntas: el fondo
// es gris neutro (rojo, verde y azul casi iguales) Y esta pegado al borde de la
// imagen. Con las dos condiciones no se come el marfil, que es calido, ni deja
// cuadritos sueltos dentro de la ficha.
import fs from 'node:fs';
import path from 'node:path';
import { leer, en, quitarElFondo, recortar, escalar, pegar, clonar, aPng } from './imagen.mjs';

const RAIZ = process.cwd();
// El arte de origen vive FUERA de `public`: si estuviera dentro, Vite lo
// copiaria al sitio publicado y se subirian cinco megas de imagenes que nadie
// descarga. Solo hacen falta para volver a generar las fichas.
const FUENTE = path.join(RAIZ, 'arte-fuente');
const SALIDA = path.join(RAIZ, 'public', 'tiles-hueso');

/** El tamano de las fichas que ya existen, para que calcen igual. */
const ANCHO = 399;
const ALTO = 213;

// ---------------------------------------------------------------- imagenes

// ---------------------------------------------------------------- la ficha

/**
 * Donde van los puntos dentro de una mitad, en fracciones de su lado.
 *
 * Es la disposicion de toda la vida, la misma que tienen las fichas que ya
 * usaba el juego: el seis en tres columnas por dos filas, porque la ficha esta
 * acostada y cada mitad es un cuadrado.
 */
const A = 0.26;
const M = 0.5;
const Z = 0.74;

const PUNTOS = {
  0: [],
  1: [[M, M]],
  2: [[A, A], [Z, Z]],
  3: [[A, A], [M, M], [Z, Z]],
  4: [[A, A], [Z, A], [A, Z], [Z, Z]],
  5: [[A, A], [Z, A], [M, M], [A, Z], [Z, Z]],
  6: [[A, A], [M, A], [Z, A], [A, Z], [M, Z], [Z, Z]]
};

function main() {
  if (!fs.existsSync(path.join(FUENTE, 'hueso-ficha.png'))) {
    console.error('Falta arte-fuente/hueso-ficha.png');
    process.exit(1);
  }

  console.log('');
  console.log('  leyendo las dos imagenes de origen...');

  // La ficha: sin limite de brillo, porque su borde de abajo es oscuro.
  const ficha = recortar(quitarElFondo(leer(path.join(FUENTE, 'hueso-ficha.png')), { difMax: 16 }));

  // El punto: con limite de brillo, o se borraria el punto, que tambien es gris.
  const punto = recortar(
    quitarElFondo(leer(path.join(FUENTE, 'hueso-punto.png')), { difMax: 20, minBrillo: 140 })
  );

  console.log(`    ficha ${ficha.ancho}x${ficha.alto}   punto ${punto.ancho}x${punto.alto}`);

  const cuerpo = escalar(ficha, ANCHO, ALTO);

  // El punto ocupa poco menos de un tercio de la mitad: mas grande se tocan
  // entre ellos en el seis, y mas chico la ficha se ve vacia.
  const ladoDelPunto = Math.round(ALTO * 0.19);
  const puntoChico = escalar(punto, ladoDelPunto, ladoDelPunto);

  // La linea del medio. Va por codigo y no en la imagen de origen: asi cae
  // exactamente en el centro y las dos mitades quedan iguales.
  const lineaAncho = Math.max(2, Math.round(ANCHO * 0.006));
  const lineaMargen = Math.round(ALTO * 0.14);

  fs.mkdirSync(SALIDA, { recursive: true });

  let hechas = 0;
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      const img = clonar(cuerpo);

      // La linea, con el color de un punto pero suave: en una ficha de hueso
      // esta rayada, no pintada.
      for (let y = lineaMargen; y < ALTO - lineaMargen; y++) {
        for (let x = 0; x < lineaAncho; x++) {
          const d = en(img, Math.round(ANCHO / 2 - lineaAncho / 2) + x, y);
          if (img.px[d + 3] === 0) continue;
          for (let c = 0; c < 3; c++) {
            img.px[d + c] = Math.round(img.px[d + c] * 0.42);
          }
        }
      }

      // Los puntos de cada mitad. Cada mitad es un cuadrado de lado ALTO.
      [a, b].forEach((valor, mitad) => {
        const origen = mitad === 0 ? 0 : ANCHO - ALTO;
        for (const [fx, fy] of PUNTOS[valor]) {
          pegar(
            img,
            puntoChico,
            Math.round(origen + fx * ALTO - ladoDelPunto / 2),
            Math.round(fy * ALTO - ladoDelPunto / 2)
          );
        }
      });

      fs.writeFileSync(path.join(SALIDA, `tile_${a}_${b}.png`), aPng(img));
      hechas++;
    }
  }

  console.log(`  ${hechas} fichas escritas en public/tiles-hueso/`);
  console.log('');
}

main();
