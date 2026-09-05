// Los desbloqueos: lo que cada uno se gana jugando.
//
// Viven en el servidor y no en el navegador: un premio que se puede regalar
// editando el telefono no es un premio.
import { initDatabase, query } from './config/database.js';
import * as Desbloqueo from './models/Desbloqueo.js';

let pasados = 0, fallados = 0;
const check = (ok, texto) => { console.log(`  ${ok ? '✓' : '✗'} ${texto}`); ok ? pasados++ : fallados++; };

const UNO = 970001;
const OTRO = 970002;

async function main() {
  await initDatabase();
  await query('DELETE FROM desbloqueos WHERE user_id >= ?', [970000]);

  check((await Desbloqueo.de(UNO)).length === 0, 'Quien no jugo nada no tiene nada');
  check(await Desbloqueo.tiene(UNO, 'fichas:oro') === false, 'Y no tiene la pinta de oro');

  check(await Desbloqueo.dar(UNO, 'fichas:oro') === true, 'Se le puede dar un premio');
  check(await Desbloqueo.tiene(UNO, 'fichas:oro') === true, 'Y le queda');

  check(await Desbloqueo.dar(UNO, 'fichas:oro') === false, 'Darlo dos veces avisa que ya lo tenia');
  const suyas = await Desbloqueo.de(UNO);
  check(suyas.length === 1, 'Y no se duplica');

  await Desbloqueo.dar(UNO, 'pano:marmol');
  check((await Desbloqueo.de(UNO)).length === 2, 'Se pueden acumular premios distintos');

  check((await Desbloqueo.de(OTRO)).length === 0, 'Lo de uno no se le pega a otro');

  await Desbloqueo.quitar(UNO, 'fichas:oro');
  check(await Desbloqueo.tiene(UNO, 'fichas:oro') === false, 'Se le puede quitar');
  check((await Desbloqueo.de(UNO)).length === 1, 'Y el resto se queda');

  await query('DELETE FROM desbloqueos WHERE user_id >= ?', [970000]);

  console.log('');
  console.log('========================================');
  console.log(`Pasados: ${pasados} | Fallados: ${fallados}`);
  process.exit(fallados > 0 ? 1 : 0);
}

main().catch((err) => { console.error('La prueba se rompio:', err); process.exit(1); });
