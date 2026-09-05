// Arma las 28 fichas de cada pinta a partir de DOS imagenes por pinta.
//
//   npm run fichas
//
// Entra:  arte-fuente/<pinta>-ficha.png   (la ficha vacia)
//         arte-fuente/<pinta>-punto.png   (un punto)
// Sale:   public/tiles-<pinta>/tile_0_0.png ... tile_6_6.png
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
const FUENTE = path.join(RAIZ, 'arte-fuente');

/** El tamano de las fichas que ya existen, para que calcen igual. */
const ANCHO = 399;
const ALTO = 213;

/**
 * Las pintas que se arman, cada una con lo suyo.
 *
 * `areaPuntos` es el rectangulo de la MITAD IZQUIERDA donde caben los puntos,
 * en fracciones de la ficha entera. Hace falta porque no todas las pintas tienen
 * el mismo sitio util: la de hueso es lisa y los puntos usan casi toda la mitad,
 * pero la de oro tiene un marco grueso y los puntos van dentro del panel negro.
 * Los numeros salen de medir la imagen, no de calcularlos a ojo.
 *
 * `lineaPropia` dice si la raya del medio ya viene dibujada en la imagen. En la
 * de oro es una barra dorada que vino con el arte; en la de hueso hay que
 * trazarla, porque una ficha de hueso la tiene rayada y el arte no la trae.
 */
const PINTAS = [
  {
    id: 'hueso',
    nombre: 'Blanco hueso',
    // El punto es neutro pero OSCURO, asi que el fondo se distingue por claro.
    recorteFicha: { difMax: 16 },
    recortePunto: { difMax: 20, minBrillo: 140 },
    lineaPropia: false,
    areaPuntos: { x1: 0.02, x2: 0.48, y1: 0.06, y2: 0.94 },
    ladoPunto: 0.19
  },
  {
    id: 'oro',
    nombre: 'Negro y oro',
    recorteFicha: { difMax: 16 },
    // El punto dorado es calido, asi que aqui no hace falta mirar el brillo.
    recortePunto: { difMax: 16 },
    lineaPropia: true,
    // Medido sobre la imagen: el oro tiene dif 44 a 106 y el onix 2 a 7. El
    // panel negro de la mitad izquierda va de 0,06 a 0,46 de ancho y de 0,14 a
    // 0,87 de alto.
    areaPuntos: { x1: 0.06, x2: 0.46, y1: 0.14, y2: 0.87 },
    ladoPunto: 0.17
  }
];

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

/** Arma las 28 fichas de una pinta. */
function armarPinta(pinta) {
  const rutaFicha = path.join(FUENTE, `${pinta.id}-ficha.png`);
  const rutaPunto = path.join(FUENTE, `${pinta.id}-punto.png`);

  if (!fs.existsSync(rutaFicha) || !fs.existsSync(rutaPunto)) {
    console.log(`  ${pinta.nombre.padEnd(14)} SALTADA: faltan ${pinta.id}-ficha.png o ${pinta.id}-punto.png`);
    return;
  }

  const ficha = recortar(quitarElFondo(leer(rutaFicha), pinta.recorteFicha));
  const punto = recortar(quitarElFondo(leer(rutaPunto), pinta.recortePunto));

  const cuerpo = escalar(ficha, ANCHO, ALTO);
  const ladoDelPunto = Math.round(ALTO * pinta.ladoPunto);
  const puntoChico = escalar(punto, ladoDelPunto, ladoDelPunto);

  const salida = path.join(RAIZ, 'public', `tiles-${pinta.id}`);
  fs.mkdirSync(salida, { recursive: true });

  const caja = pinta.areaPuntos;
  const anchoCaja = (caja.x2 - caja.x1) * ANCHO;
  const altoCaja = (caja.y2 - caja.y1) * ALTO;

  const lineaAncho = Math.max(2, Math.round(ANCHO * 0.006));
  const lineaMargen = Math.round(ALTO * 0.14);

  let hechas = 0;
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      const img = clonar(cuerpo);

      // La raya del medio, solo si la pinta no la trae ya dibujada.
      if (!pinta.lineaPropia) {
        for (let y = lineaMargen; y < ALTO - lineaMargen; y++) {
          for (let x = 0; x < lineaAncho; x++) {
            const d = en(img, Math.round(ANCHO / 2 - lineaAncho / 2) + x, y);
            if (img.px[d + 3] === 0) continue;
            for (let c = 0; c < 3; c++) img.px[d + c] = Math.round(img.px[d + c] * 0.42);
          }
        }
      }

      // Los puntos, dentro de la caja util de cada mitad. La derecha es la
      // izquierda reflejada, para que las dos queden simetricas de verdad.
      [a, b].forEach((valor, mitad) => {
        for (const [fx, fy] of PUNTOS[valor]) {
          const dentroX = caja.x1 * ANCHO + fx * anchoCaja;
          const x = mitad === 0 ? dentroX : ANCHO - dentroX;
          const y = caja.y1 * ALTO + fy * altoCaja;
          pegar(img, puntoChico, Math.round(x - ladoDelPunto / 2), Math.round(y - ladoDelPunto / 2));
        }
      });

      fs.writeFileSync(path.join(salida, `tile_${a}_${b}.png`), aPng(img));
      hechas++;
    }
  }

  console.log(`  ${pinta.nombre.padEnd(14)} ${hechas} fichas en public/tiles-${pinta.id}/`);
}

function main() {
  console.log('');
  for (const pinta of PINTAS) armarPinta(pinta);
  console.log('');
}

main();
