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
import zlib from 'node:zlib';
import jpeg from 'jpeg-js';

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

const leer = (archivo) => {
  const crudo = jpeg.decode(fs.readFileSync(archivo), { useTArray: true });
  return { ancho: crudo.width, alto: crudo.height, px: crudo.data };
};

const en = (img, x, y) => (y * img.ancho + x) * 4;

/**
 * Marca como transparente el fondo cuadriculado.
 *
 * Se recorre desde los bordes hacia adentro (relleno por inundacion). Un pixel
 * es fondo si es GRIS NEUTRO y ademas se llega a el desde el borde. Pedir las
 * dos cosas es lo que evita comerse partes claras de la ficha.
 */
function quitarElFondo(img, toleranciaGris = 26) {
  const { ancho, alto, px } = img;
  const visto = new Uint8Array(ancho * alto);
  const pila = [];

  const esNeutro = (i) => {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Neutro (sin color) y ademas claro: el cuadriculado es blanco y gris.
    return max - min <= toleranciaGris && min >= 150;
  };

  const meter = (x, y) => {
    if (x < 0 || y < 0 || x >= ancho || y >= alto) return;
    const k = y * ancho + x;
    if (visto[k]) return;
    if (!esNeutro(k * 4)) return;
    visto[k] = 1;
    pila.push(x, y);
  };

  for (let x = 0; x < ancho; x++) { meter(x, 0); meter(x, alto - 1); }
  for (let y = 0; y < alto; y++) { meter(0, y); meter(ancho - 1, y); }

  while (pila.length) {
    const y = pila.pop();
    const x = pila.pop();
    meter(x + 1, y); meter(x - 1, y); meter(x, y + 1); meter(x, y - 1);
  }

  for (let k = 0; k < visto.length; k++) if (visto[k]) px[k * 4 + 3] = 0;
  return img;
}

/** Deja solo lo que se ve, sin el aire de alrededor. */
function recortar(img) {
  const { ancho, alto, px } = img;
  let x1 = ancho, x2 = -1, y1 = alto, y2 = -1;

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (px[en(img, x, y) + 3] > 12) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
      }
    }
  }

  if (x2 < x1 || y2 < y1) throw new Error('la imagen quedo vacia al recortar');

  const w = x2 - x1 + 1;
  const h = y2 - y1 + 1;
  const salida = { ancho: w, alto: h, px: new Uint8Array(w * h * 4) };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = en(img, x1 + x, y1 + y);
      const d = en(salida, x, y);
      for (let c = 0; c < 4; c++) salida.px[d + c] = px[o + c];
    }
  }
  return salida;
}

/** Cambia el tamano promediando: sin esto los bordes salen dentados. */
function escalar(img, ancho, alto) {
  const salida = { ancho, alto, px: new Uint8Array(ancho * alto * 4) };
  const escalaX = img.ancho / ancho;
  const escalaY = img.alto / alto;

  for (let y = 0; y < alto; y++) {
    const y0 = Math.floor(y * escalaY);
    const y1 = Math.max(y0 + 1, Math.min(img.alto, Math.ceil((y + 1) * escalaY)));
    for (let x = 0; x < ancho; x++) {
      const x0 = Math.floor(x * escalaX);
      const x1 = Math.max(x0 + 1, Math.min(img.ancho, Math.ceil((x + 1) * escalaX)));

      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = en(img, sx, sy);
          const alfa = img.px[i + 3] / 255;
          // Se promedia el color YA multiplicado por su alfa: si no, los pixeles
          // invisibles del borde tinen de gris el contorno de la ficha.
          r += img.px[i] * alfa;
          g += img.px[i + 1] * alfa;
          b += img.px[i + 2] * alfa;
          a += img.px[i + 3];
          n++;
        }
      }

      const d = en(salida, x, y);
      const alfaMedia = a / n;
      const peso = alfaMedia > 0 ? (a / 255) : 1;
      salida.px[d] = Math.round(r / peso);
      salida.px[d + 1] = Math.round(g / peso);
      salida.px[d + 2] = Math.round(b / peso);
      salida.px[d + 3] = Math.round(alfaMedia);
    }
  }
  return salida;
}

/** Pega una imagen encima de otra, respetando la transparencia. */
function pegar(fondo, encima, izquierda, arriba) {
  for (let y = 0; y < encima.alto; y++) {
    const dy = arriba + y;
    if (dy < 0 || dy >= fondo.alto) continue;
    for (let x = 0; x < encima.ancho; x++) {
      const dx = izquierda + x;
      if (dx < 0 || dx >= fondo.ancho) continue;

      const o = en(encima, x, y);
      const alfa = encima.px[o + 3] / 255;
      if (alfa <= 0) continue;

      const d = en(fondo, dx, dy);
      for (let c = 0; c < 3; c++) {
        fondo.px[d + c] = Math.round(encima.px[o + c] * alfa + fondo.px[d + c] * (1 - alfa));
      }
      fondo.px[d + 3] = Math.max(fondo.px[d + 3], encima.px[o + 3]);
    }
  }
}

const clonar = (img) => ({ ancho: img.ancho, alto: img.alto, px: Uint8Array.from(img.px) });

// ---------------------------------------------------------------- PNG

const tablaCrc = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = tablaCrc[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

function aPng(img) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.ancho, 0);
  ihdr.writeUInt32BE(img.alto, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const filas = Buffer.alloc(img.alto * (img.ancho * 4 + 1));
  for (let y = 0; y < img.alto; y++) {
    const destino = y * (img.ancho * 4 + 1);
    filas[destino] = 0;
    Buffer.from(img.px.buffer, img.px.byteOffset + y * img.ancho * 4, img.ancho * 4)
      .copy(filas, destino + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', zlib.deflateSync(filas, { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

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

  const ficha = recortar(quitarElFondo(leer(path.join(FUENTE, 'hueso-ficha.png'))));
  const punto = recortar(quitarElFondo(leer(path.join(FUENTE, 'hueso-punto.png'))));

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
