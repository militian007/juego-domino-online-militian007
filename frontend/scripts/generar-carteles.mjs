// Deja listos los carteles pintados del fin de ronda (§130).
//
//   npm run carteles
//
// Entra:  arte-fuente/cartel-domino.png   fondo magenta
//         arte-fuente/cartel-tranca.png
//         arte-fuente/cartel-ganaste.png
// Sale:   public/carteles/<id>.png, con fondo transparente
//
// Mismo camino que los stickers: fondo magenta puro y se borra por color. Los
// carteles llevan contorno crema y relleno dorado, los dos casi neutros, asi
// que buscar "gris de fondo" se comeria el dibujo.
//
// ## No llevan rayos
//
// Los rayos de sol siguen siendo CSS y giran despacio por detras. Pintados en
// la imagen se quedarian quietos, que es peor: lo que da vida es el giro.
import fs from 'node:fs';
import path from 'node:path';
import { leer, quitarElFondoPorColor, recortar, escalar, aPng } from './imagen.mjs';

const RAIZ = process.cwd();
const FUENTE = path.join(RAIZ, 'arte-fuente');
const SALIDA = path.join(RAIZ, 'public', 'carteles');

/**
 * El alto al que se guardan.
 *
 * En un telefono de 375 el cartel se ve a unos 80 pixeles de alto. Se guardan a
 * 320 —cuatro veces— para que en pantallas finas siga nitido, y aun asi pesan
 * poco porque son pocas formas y mucho transparente.
 */
const ALTO = 320;

const CARTELES = ['domino', 'tranca', 'ganaste'];

function preparar(origen) {
  const limpio = recortar(quitarElFondoPorColor(leer(origen)));
  const ancho = Math.max(1, Math.round((limpio.ancho / limpio.alto) * ALTO));
  return escalar(limpio, ancho, ALTO);
}

function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  let hechos = 0;

  for (const id of CARTELES) {
    const origen = path.join(FUENTE, `cartel-${id}.png`);
    if (!fs.existsSync(origen)) {
      console.log(`  · falta ${path.relative(RAIZ, origen)} — se salta`);
      continue;
    }
    const img = preparar(origen);
    const destino = path.join(SALIDA, `${id}.png`);
    fs.writeFileSync(destino, aPng(img));
    const kb = (fs.statSync(destino).size / 1024).toFixed(0);
    console.log(`  ✓ ${id}.png  ${img.ancho}x${img.alto}  ${kb} KB`);
    hechos++;
  }

  if (hechos === 0) {
    console.log('');
    console.log('  No habia ningun cartel en arte-fuente/.');
    console.log('  El prompt para pedirlos esta en contexto/prompts/carteles-de-fin-de-ronda.md');
    console.log('  Mientras no esten, el juego usa el cartel de tipografia y no se rompe nada.');
  }
}

main();
