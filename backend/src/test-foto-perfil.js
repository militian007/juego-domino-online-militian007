// La foto del perfil (§147).
//
//   npm run test:foto
//
// Lo que se prueba no es "sube una foto y se ve". Eso se ve mirando la
// pantalla. Aqui se prueba lo que pasa cuando alguien **se salta la pantalla**
// y llama a la ruta a mano, que es lo unico que puede hacer dano:
//
//   - mandar algo que no es una imagen
//   - mandar un archivo enorme
//   - mandar un JPEG chiquito que por dentro dice medir 30000x30000
//   - mandar un SVG con un <script> adentro
import 'dotenv/config';
import { query, initDatabase } from './config/database.js';
import * as Foto from './models/FotoDePerfil.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

const YO = 950001;
const OTRO = 950002;

const aDataUrl = (bytes) => 'data:image/jpeg;base64,' + Buffer.from(bytes).toString('base64');

/**
 * Un JPEG minimo de verdad: SOI, un SOF0 que declara el tamano, y EOI.
 *
 * No hace falta que tenga pixeles: lo que revisa el servidor es la cabecera.
 */
function jpegDe(ancho, alto, relleno = 0) {
  const sof = [
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (alto >> 8) & 0xff, alto & 0xff,
    (ancho >> 8) & 0xff, ancho & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01
  ];
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from(sof),
    Buffer.alloc(relleno, 0x5a),
    Buffer.from([0xff, 0xd9])
  ]);
}

async function limpiar() {
  await query('DELETE FROM fotos_de_perfil WHERE user_id IN (?, ?)', [YO, OTRO]);
}

async function main() {
  await initDatabase();
  await limpiar();

  // ---- 1. Una foto normal entra --------------------------------------
  const buena = aDataUrl(jpegDe(256, 256, 2000));
  const puesta = await Foto.poner(YO, buena);
  check(puesta.ok === true, 'una foto de 256x256 se guarda');
  check((await Foto.de(YO)) === buena, 'y se lee igual que se guardo');

  // ---- 2. Lo que NO es una imagen ------------------------------------
  const noEsImagen = [
    ['texto pelado', 'hola soy una foto'],
    ['nada', ''],
    ['un numero', 12345],
    ['nulo', null],
    ['un objeto', { foto: 'x' }],
    ['una direccion http', 'http://ejemplo.com/foto.jpg'],
    ['un PNG disfrazado de JPEG', 'data:image/jpeg;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')]
  ];
  for (const [que, valor] of noEsImagen) {
    const r = await Foto.poner(OTRO, valor);
    check(r.ok === false, `se rechaza ${que}`);
  }

  // ---- 3. El SVG, que es el peligroso --------------------------------
  //
  // Un SVG no es una imagen: es un documento, puede traer <script> y se
  // ejecuta al mostrarlo. Si entrara, cualquiera le correria codigo en el
  // navegador a todos los que se sienten en su mesa.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  const comoSvg = await Foto.poner(OTRO, 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
  check(comoSvg.ok === false, 'se rechaza un SVG (puede traer codigo adentro)');

  const svgMintiendo = await Foto.poner(OTRO, 'data:image/jpeg;base64,' + Buffer.from(svg).toString('base64'));
  check(svgMintiendo.ok === false, 'y tambien un SVG que dice ser JPEG');

  // ---- 4. Lo que pesa de mas -----------------------------------------
  const gorda = await Foto.poner(OTRO, aDataUrl(jpegDe(256, 256, 60 * 1024)));
  check(gorda.ok === false, 'se rechaza una foto de mas de 40 KB');
  check(/pesa/.test(gorda.error ?? ''), `y lo dice claro ("${gorda.error}")`);

  // ---- 5. LA IMPORTANTE: la bomba de descompresion -------------------
  //
  // Un JPEG de dos kilos puede declarar en su cabecera que mide 30000x30000.
  // Quien lo abra reserva memoria para novecientos millones de pixeles y se
  // cae. Pesa poco, asi que el limite de peso no lo ve: hay que mirar la
  // cabecera.
  const bomba = aDataUrl(jpegDe(30000, 30000, 1000));
  const r5 = await Foto.poner(OTRO, bomba);
  check(r5.ok === false, 'se rechaza un JPEG chiquito que declara 30000x30000');
  check(
    Buffer.from(bomba.split(',')[1], 'base64').length < 40 * 1024,
    'y no era por el peso: la bomba pesa menos de 40 KB'
  );

  const pasada = await Foto.poner(OTRO, aDataUrl(jpegDe(400, 400, 500)));
  check(pasada.ok === false, 'se rechaza tambien una de 400x400, que ya pasa del tope');

  // ---- 6. Un JPEG sin cabecera legible --------------------------------
  const sinSof = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
  const r6 = await Foto.poner(OTRO, sinSof);
  check(r6.ok === false, 'se rechaza un JPEG al que no se le puede leer el tamano');

  // ---- 7. Nada de lo rechazado dejo rastro ----------------------------
  check((await Foto.de(OTRO)) === null, 'despues de todos los rechazos, OTRO sigue sin foto');
  check((await Foto.de(YO)) === buena, 'y la foto buena de YO sigue intacta');

  // ---- 8. Cambiarla no acumula ----------------------------------------
  const segunda = aDataUrl(jpegDe(200, 200, 1500));
  await Foto.poner(YO, segunda);
  check((await Foto.de(YO)) === segunda, 'cambiar la foto la reemplaza');
  const filas = await query('SELECT user_id FROM fotos_de_perfil WHERE user_id = ?', [YO]);
  check(filas.rows.length === 1, 'y deja UNA sola fila, no una por cambio');

  // ---- 9. Quitarla ----------------------------------------------------
  await Foto.quitar(YO);
  check((await Foto.de(YO)) === null, 'quitar la foto la borra');

  // ---- 10. Varias de un tiron ------------------------------------------
  await Foto.poner(YO, buena);
  await Foto.poner(OTRO, segunda);
  const varias = await Foto.deVarios([YO, OTRO, 999999]);
  check(varias[YO] === buena && varias[OTRO] === segunda, 'deVarios trae las de cada uno');
  check(varias[999999] === undefined, 'y no inventa nada para quien no tiene');
  check(Object.keys(await Foto.deVarios([])).length === 0, 'con la lista vacia devuelve vacio');

  await limpiar();

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('La prueba se rompio:', err.message);
  process.exit(1);
});
