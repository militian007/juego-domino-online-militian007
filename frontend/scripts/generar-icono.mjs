// Dibuja el icono de la app: la ficha del doble seis.
//
// Sin librerias de imagen. El PNG se escribe a mano con `zlib`, que ya viene
// con Node, igual que el motor del juego no tiene dependencias. Se dibuja al
// cuadruple de tamano y se reduce, que es como se consiguen los bordes suaves
// sin un motor de dibujo.
//
//   node scripts/generar-icono.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const SALIDA = path.join(process.cwd(), 'public');

// ---------------------------------------------------------------- colores
const FONDO = [15, 74, 54, 255];        // el verde del paño
const FICHA = [26, 32, 44, 255];        // el marfil oscuro de las fichas
const BORDE = [212, 175, 55, 255];      // oro
const PUNTO = [254, 243, 199, 255];     // crema

// ---------------------------------------------------------------- lienzo
function lienzo(lado) {
  return { lado, px: new Uint8Array(lado * lado * 4) };
}

const poner = (c, x, y, color) => {
  if (x < 0 || y < 0 || x >= c.lado || y >= c.lado) return;
  const i = (y * c.lado + x) * 4;
  c.px[i] = color[0]; c.px[i + 1] = color[1]; c.px[i + 2] = color[2]; c.px[i + 3] = color[3];
};

const rellenar = (c, color) => {
  for (let y = 0; y < c.lado; y++) for (let x = 0; x < c.lado; x++) poner(c, x, y, color);
};

/** Rectangulo con las esquinas redondeadas. */
function rect(c, x0, y0, w, h, r, color) {
  for (let y = Math.floor(y0); y < y0 + h; y++) {
    for (let x = Math.floor(x0); x < x0 + w; x++) {
      const dx = Math.max(x0 + r - x, x - (x0 + w - 1 - r), 0);
      const dy = Math.max(y0 + r - y, y - (y0 + h - 1 - r), 0);
      if (dx * dx + dy * dy > r * r) continue;
      poner(c, x, y, color);
    }
  }
}

function circulo(c, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) poner(c, x, y, color);
    }
  }
}

/** Reduce a la mitad varias veces: es lo que suaviza los bordes. */
function reducir(c, veces) {
  let act = c;
  for (let v = 0; v < veces; v++) {
    const nuevo = lienzo(act.lado / 2);
    for (let y = 0; y < nuevo.lado; y++) {
      for (let x = 0; x < nuevo.lado; x++) {
        const s = [0, 0, 0, 0];
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const i = ((y * 2 + oy) * act.lado + (x * 2 + ox)) * 4;
          for (let k = 0; k < 4; k++) s[k] += act.px[i + k];
        }
        const i = (y * nuevo.lado + x) * 4;
        for (let k = 0; k < 4; k++) nuevo.px[i + k] = Math.round(s[k] / 4);
      }
    }
    act = nuevo;
  }
  return act;
}

// ---------------------------------------------------------------- el dibujo
/**
 * La ficha del doble seis, de pie.
 *
 * De pie y no acostada porque asi es como se pone un doble en la mesa: cruzado.
 * Y porque en un cuadrado se ve mas grande.
 *
 * @param margen cuanto aire se deja alrededor (el icono "maskable" necesita mas,
 *   porque el sistema le recorta las esquinas)
 */
function dibujar(lado, margen) {
  const c = lienzo(lado);
  rellenar(c, FONDO);

  const alto = lado * (1 - 2 * margen);
  const ancho = alto / 2;
  const x0 = (lado - ancho) / 2;
  const y0 = (lado - alto) / 2;
  const r = ancho * 0.14;
  const grosor = Math.max(2, lado * 0.018);

  rect(c, x0, y0, ancho, alto, r, BORDE);
  rect(c, x0 + grosor, y0 + grosor, ancho - 2 * grosor, alto - 2 * grosor, r * 0.8, FICHA);

  // La linea que parte la ficha en dos mitades.
  rect(c, x0 + grosor * 2, (lado - grosor) / 2, ancho - grosor * 4, grosor, 0, BORDE);

  // Seis puntos por mitad: dos columnas de tres.
  const rp = ancho * 0.088;
  const colX = [x0 + ancho * 0.31, x0 + ancho * 0.69];
  for (const mitad of [0, 1]) {
    const base = y0 + (alto / 2) * mitad;
    const filaY = [base + alto * 0.11, base + alto * 0.25, base + alto * 0.39];
    for (const cx of colX) for (const cy of filaY) circulo(c, cx, cy, rp, PUNTO);
  }

  return c;
}

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

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = tablaCrc[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

function png(c) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.lado, 0);
  ihdr.writeUInt32BE(c.lado, 4);
  ihdr[8] = 8;    // bits por canal
  ihdr[9] = 6;    // RGBA
  // Cada fila lleva delante un byte de filtro; 0 = sin filtro.
  const filas = Buffer.alloc(c.lado * (c.lado * 4 + 1));
  for (let y = 0; y < c.lado; y++) {
    const destino = y * (c.lado * 4 + 1);
    filas[destino] = 0;
    Buffer.from(c.px.buffer, y * c.lado * 4, c.lado * 4).copy(filas, destino + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', zlib.deflateSync(filas, { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------- a disco
const escribir = (nombre, lado, margen) => {
  const grande = dibujar(lado * 4, margen);
  const buf = png(reducir(grande, 2));
  fs.writeFileSync(path.join(SALIDA, nombre), buf);
  console.log(`  ${nombre.padEnd(26)} ${lado}x${lado}  ${(buf.length / 1024).toFixed(1)} KB`);
};

console.log('');
escribir('icono-192.png', 192, 0.13);
escribir('icono-512.png', 512, 0.13);
// El "maskable" lleva mas aire: el sistema operativo le recorta las esquinas
// para darle la forma de sus iconos, y sin margen se comeria la ficha.
escribir('icono-maskable-512.png', 512, 0.24);
console.log('');
