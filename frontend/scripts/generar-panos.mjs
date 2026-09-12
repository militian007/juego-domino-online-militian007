// Los paños de colores, recoloreando el que ya existe (§140).
//
//   npm run panos
//
// Entra:  el paño verde que ya usa el juego (public/pano-tela.webp, pasado a
//         JPEG por ffmpeg — el lector de este proyecto solo entiende JPEG).
// Sale:   public/pano-<color>.webp
//
// ## Por que recolorear y no pedirle otra tela a la IA
//
// Dos razones, y la segunda es la que manda:
//
// 1. **Gemini bloquea el pedido.** "Paño de mesa de juego" lo asocia a casinos y
//    corta. Se reescribio en neutro y siguio cortando.
// 2. **El mosaico ya esta resuelto.** Lo dificil de una textura que se repite no
//    es el color: es que los cuatro bordes encajen sin que se vea la union. El
//    paño verde YA encaja —esta espejado en 2x2 a proposito—, asi que
//    recolorearlo hereda esa propiedad gratis. Una tela nueva habria que volver
//    a comprobarla, y lo mas probable es que se le viera la grilla.
//
// ## Como se recolorea sin aplastar el tejido
//
// No se cambia el tono y ya: eso deja el verde asomando en las sombras. Se mide
// el BRILLO de cada pixel, se divide por el brillo medio de la tela, y ese
// factor se aplica al color nuevo. Asi cada fibra conserva si era mas clara o
// mas oscura que sus vecinas —que es lo que hace que se vea tela y no un
// rectangulo de color— pero el color de conjunto es el que se pide.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { leer, aPng } from './imagen.mjs';

const RAIZ = process.cwd();
const ORIGEN = path.join(RAIZ, 'public', 'pano-tela.webp');
const SALIDA = path.join(RAIZ, 'public');

/** Los colores nuevos. El verde de siempre se queda como esta. */
const COLORES = [
  { id: 'granate', nombre: 'Granate', rgb: [106, 27, 41] },
  { id: 'azul', nombre: 'Azul medianoche', rgb: [20, 35, 63] }
];

/** Cuanto se deja variar el brillo. Sin tope, los brillos se queman a blanco. */
const TOPE = 1.85;

function aJpegTemporal() {
  const destino = path.join(RAIZ, 'pano-origen.tmp.jpg');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', ORIGEN, '-q:v', '2', destino]);
  return destino;
}

function recolorear(img, [R, G, B]) {
  const { ancho, alto, px } = img;
  const salida = new Uint8Array(px.length);

  // El brillo medio de la tela: es la referencia contra la que se compara cada
  // fibra. Se calcula sobre la imagen entera, una sola vez.
  let suma = 0;
  for (let i = 0; i < px.length; i += 4) {
    suma += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  }
  const medio = suma / (px.length / 4);

  for (let i = 0; i < px.length; i += 4) {
    const brillo = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const factor = Math.min(TOPE, brillo / medio);
    salida[i] = Math.min(255, Math.round(R * factor));
    salida[i + 1] = Math.min(255, Math.round(G * factor));
    salida[i + 2] = Math.min(255, Math.round(B * factor));
    salida[i + 3] = 255;
  }

  return { ancho, alto, px: salida };
}

function main() {
  if (!fs.existsSync(ORIGEN)) {
    console.log(`  Falta ${path.relative(RAIZ, ORIGEN)}`);
    return;
  }

  const temporal = aJpegTemporal();
  const tela = leer(temporal);

  for (const c of COLORES) {
    const img = recolorear(tela, c.rgb);
    // Se guarda en WEBP, como el verde de siempre. En PNG la misma tela pesa
    // 418 KB contra 117: es una textura fotografica, y el PNG comprime mal las
    // fotos. Se escribe un PNG temporal porque es lo unico que sabe escribir
    // este proyecto, y ffmpeg lo pasa a WEBP.
    const temporalPng = path.join(RAIZ, `pano-${c.id}.tmp.png`);
    fs.writeFileSync(temporalPng, aPng(img));
    const destino = path.join(SALIDA, `pano-${c.id}.webp`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', temporalPng, '-quality', '86', destino]);
    fs.unlinkSync(temporalPng);
    const kb = (fs.statSync(destino).size / 1024).toFixed(0);
    console.log(`  ✓ pano-${c.id}.webp  ${img.ancho}x${img.alto}  ${kb} KB`);
  }

  fs.unlinkSync(temporal);
}

main();
