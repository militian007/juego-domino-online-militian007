// Herramientas de imagen compartidas por los scripts de arte.
//
// Sin dependencias de imagen mas alla de `jpeg-js`, que hace falta porque lo que
// devuelve Gemini son JPEG aunque digan .png. El PNG se lee y se escribe a mano
// con `zlib`, que ya viene con Node.
//
// Viven aparte porque las usan dos scripts: el de las fichas blanco hueso y el
// de los iconos de los atajos. Copiarlas en los dos seria arreglar cada cosa
// dos veces.
import fs from 'node:fs';
import zlib from 'node:zlib';
import jpeg from 'jpeg-js';

export const leer = (archivo) => {
  const crudo = jpeg.decode(fs.readFileSync(archivo), { useTArray: true });
  return { ancho: crudo.width, alto: crudo.height, px: crudo.data };
};

export const en = (img, x, y) => (y * img.ancho + x) * 4;

/**
 * Marca como transparente el fondo cuadriculado.
 *
 * Se recorre desde los bordes hacia adentro (relleno por inundacion). Un pixel
 * es fondo si es GRIS NEUTRO y ademas se llega a el desde el borde. Pedir las
 * dos cosas a la vez es lo que evita comerse la ficha.
 *
 * ## Los numeros salen de medir, no de tantear
 *
 * En las imagenes que mando Jonathan:
 *
 *   fondo cuadriculado   dif 0 a 3     (gris puro)
 *   marfil de la ficha   dif 24 a 57   (siempre calido)
 *   punto negro          dif 0 a 3, pero OSCURO (min 12 a 49)
 *
 * El primer intento uso dif <= 26 y **se comio el borde de la ficha**, que
 * ronda dif 25: la ficha salia cortada recta por la izquierda y con las
 * esquinas mordidas. Con 16 hay margen de sobra para los dos lados.
 *
 * El limite de brillo solo vale para el PUNTO: ahi el fondo es claro y el punto
 * oscuro, asi que hace falta para no borrar el punto. En la FICHA no se usa,
 * porque su borde de abajo es oscuro (min 132) y el limite se lo comia.
 *
 * ## Cuando el fondo queda ATRAPADO
 *
 * Si el dibujo tiene un agujero cerrado —el aro de un asa, por ejemplo— el
 * fondo de adentro no se toca con el borde y el relleno no llega: queda una
 * mancha clara dentro del dibujo. Jonathan lo vio en la copa: *"dentro de las
 * asas quedo un blanco feo"*.
 *
 * Para eso esta `porTodaLaImagen`. Borra TODO lo gris, este donde este, sin
 * pedir que se llegue desde el borde. Solo sirve cuando el dibujo no tiene
 * ninguna parte gris: en la copa y el podio el oro nunca baja de dif 70, asi
 * que no hay riesgo. En una ficha de domino NO se puede usar, porque el punto
 * negro tambien es gris.
 *
 * @param difMax          cuanto puede alejarse del gris puro para ser fondo
 * @param minBrillo       si se pasa, solo se borra lo que ademas sea claro
 * @param porTodaLaImagen borrar el gris este o no pegado al borde
 */
export function quitarElFondo(img, { difMax = 16, minBrillo = null, porTodaLaImagen = false } = {}) {
  const { ancho, alto, px } = img;
  const visto = new Uint8Array(ancho * alto);
  const pila = [];

  const esNeutro = (i) => {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min > difMax) return false;
    return minBrillo == null || min >= minBrillo;
  };

  const meter = (x, y) => {
    if (x < 0 || y < 0 || x >= ancho || y >= alto) return;
    const k = y * ancho + x;
    if (visto[k]) return;
    if (!esNeutro(k * 4)) return;
    visto[k] = 1;
    pila.push(x, y);
  };

  if (porTodaLaImagen) {
    for (let k = 0; k < visto.length; k++) if (esNeutro(k * 4)) px[k * 4 + 3] = 0;
    return img;
  }

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
export function recortar(img) {
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
export function escalar(img, ancho, alto) {
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
export function pegar(fondo, encima, izquierda, arriba) {
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

export const clonar = (img) => ({ ancho: img.ancho, alto: img.alto, px: Uint8Array.from(img.px) });

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

export function aPng(img) {
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

