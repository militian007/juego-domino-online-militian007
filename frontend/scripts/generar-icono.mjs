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
 * Las dos fichas cruzadas, como en el logo del juego.
 *
 * Antes el icono era UNA ficha dibujada a mano con circulos. Jonathan lo vio en
 * su telefono y pidio el del logo: *"pon el que hicimos, que esta brutal, el de
 * las 2 fichas"*.
 *
 * No se dibujan: se leen las fichas de verdad de `public/tiles/` y se giran, que
 * es lo mismo que hace el logo en pantalla. Asi el icono y la marca son la misma
 * cosa y no dos dibujos parecidos.
 *
 * @param margen cuanto aire se deja alrededor (el icono "maskable" necesita mas,
 *   porque el sistema le recorta las esquinas)
 */
function dibujar(lado, margen) {
  const c = lienzo(lado);
  rellenar(c, FONDO);

  // Las mismas dos fichas y los mismos angulos que el logo.
  const seisSeis = leerPng(path.join(SALIDA, 'tiles', 'tile_6_6.png'));
  const tresSeis = leerPng(path.join(SALIDA, 'tiles', 'tile_3_6.png'));

  const util = lado * (1 - 2 * margen);
  const anchoFicha = util * 0.86;
  const separacion = util * 0.1;
  const centro = lado / 2;

  pegarGirada(c, seisSeis, {
    centroX: Math.round(centro - separacion),
    centroY: Math.round(centro),
    ancho: anchoFicha,
    grados: -20
  });
  pegarGirada(c, tresSeis, {
    centroX: Math.round(centro + separacion),
    centroY: Math.round(centro),
    ancho: anchoFicha,
    grados: 16
  });

  return c;
}

// ------------------------------------------------------- leer un PNG

/**
 * Lee un PNG de los que ya tiene el juego.
 *
 * Se escribe a mano por lo mismo que el que escribe: cero dependencias. Solo
 * entiende lo que hace falta aqui, PNG de 8 bits con transparencia, que es
 * como estan guardadas las fichas.
 */
function leerPng(archivo) {
  const b = fs.readFileSync(archivo);
  const lado = { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  const canales = b[25] === 6 ? 4 : 3;

  let o = 8;
  const trozos = [];
  while (o + 8 < b.length) {
    const largo = b.readUInt32BE(o);
    if (b.slice(o + 4, o + 8).toString() === 'IDAT') trozos.push(b.slice(o + 8, o + 8 + largo));
    o += 12 + largo;
  }

  const crudo = zlib.inflateSync(Buffer.concat(trozos));
  const { ancho, alto } = lado;
  const px = new Uint8Array(ancho * alto * 4);
  const porFila = ancho * canales;
  const anterior = new Uint8Array(porFila);
  const fila = new Uint8Array(porFila);

  for (let y = 0; y < alto; y++) {
    const inicio = y * (porFila + 1);
    const filtro = crudo[inicio];

    for (let i = 0; i < porFila; i++) {
      const bruto = crudo[inicio + 1 + i];
      const izq = i >= canales ? fila[i - canales] : 0;
      const arriba = anterior[i];
      const esquina = i >= canales ? anterior[i - canales] : 0;

      let valor;
      switch (filtro) {
        case 0: valor = bruto; break;
        case 1: valor = bruto + izq; break;
        case 2: valor = bruto + arriba; break;
        case 3: valor = bruto + ((izq + arriba) >> 1); break;
        case 4: {
          // Paeth: se queda con el vecino que mejor predice este pixel.
          const p = izq + arriba - esquina;
          const pa = Math.abs(p - izq), pb = Math.abs(p - arriba), pc = Math.abs(p - esquina);
          valor = bruto + (pa <= pb && pa <= pc ? izq : pb <= pc ? arriba : esquina);
          break;
        }
        default: throw new Error(`filtro PNG desconocido: ${filtro}`);
      }
      fila[i] = valor & 0xff;
    }

    for (let x = 0; x < ancho; x++) {
      const d = (y * ancho + x) * 4;
      const s = x * canales;
      px[d] = fila[s];
      px[d + 1] = fila[s + 1];
      px[d + 2] = fila[s + 2];
      px[d + 3] = canales === 4 ? fila[s + 3] : 255;
    }
    anterior.set(fila);
  }

  return { ancho, alto, px };
}

/**
 * Dibuja una imagen girada y escalada sobre el lienzo.
 *
 * Se recorre el DESTINO y se pregunta de donde sale cada pixel (girando al
 * reves). Hacerlo al reves, recorriendo el origen, deja agujeros: al girar, dos
 * pixeles de origen pueden caer en el mismo de destino y dejar otro vacio.
 */
function pegarGirada(lienzo, img, { centroX, centroY, ancho, grados }) {
  const alto = (ancho * img.alto) / img.ancho;
  const rad = (grados * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sen = Math.sin(rad);

  // El radio del circulo que envuelve a la ficha ya girada.
  const alcance = Math.ceil(Math.hypot(ancho, alto) / 2) + 2;

  for (let y = centroY - alcance; y <= centroY + alcance; y++) {
    if (y < 0 || y >= lienzo.lado) continue;
    for (let x = centroX - alcance; x <= centroX + alcance; x++) {
      if (x < 0 || x >= lienzo.lado) continue;

      const dx = x - centroX;
      const dy = y - centroY;
      const ox = dx * cos + dy * sen;
      const oy = -dx * sen + dy * cos;

      const u = (ox / ancho + 0.5) * img.ancho;
      const v = (oy / alto + 0.5) * img.alto;
      if (u < 0 || v < 0 || u >= img.ancho - 1 || v >= img.alto - 1) continue;

      // Se mezclan los cuatro vecinos: sin esto los bordes salen dentados.
      const x0 = Math.floor(u), y0 = Math.floor(v);
      const fx = u - x0, fy = v - y0;
      const muestra = (c) => {
        const i = (y0 * img.ancho + x0) * 4 + c;
        const j = (y0 * img.ancho + x0 + 1) * 4 + c;
        const k = ((y0 + 1) * img.ancho + x0) * 4 + c;
        const l = ((y0 + 1) * img.ancho + x0 + 1) * 4 + c;
        return (img.px[i] * (1 - fx) + img.px[j] * fx) * (1 - fy)
             + (img.px[k] * (1 - fx) + img.px[l] * fx) * fy;
      };

      const alfa = muestra(3) / 255;
      if (alfa <= 0.004) continue;

      const d = (y * lienzo.lado + x) * 4;
      for (let c = 0; c < 3; c++) {
        lienzo.px[d + c] = Math.round(muestra(c) * alfa + lienzo.px[d + c] * (1 - alfa));
      }
      lienzo.px[d + 3] = 255;
    }
  }
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
