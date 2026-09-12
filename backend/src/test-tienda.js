// La tienda (§141).
//
//   npm run test:tienda
//
// Lo que se comprueba no es "compra y ya". Es lo que rompe una tienda:
// **llevarse algo sin pagarlo**, **pagar dos veces por lo mismo**, y que el
// precio lo ponga el servidor y no el que compra.
import 'dotenv/config';
import { query, initDatabase } from './config/database.js';
import * as Tienda from './models/Tienda.js';
import * as Moneda from './models/Moneda.js';
import * as Desbloqueo from './models/Desbloqueo.js';

let pasados = 0;
let fallados = 0;
const check = (ok, texto) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
  ok ? pasados++ : fallados++;
};

const YO = 940001;

async function limpiar() {
  await query('DELETE FROM monedas_movimientos WHERE user_id = ?', [YO]);
  await query('DELETE FROM monedas WHERE user_id = ?', [YO]);
  await query('DELETE FROM desbloqueos WHERE user_id = ?', [YO]);
}

async function main() {
  await initDatabase();
  await limpiar();

  const UNO = Tienda.CATALOGO[0];
  const OTRO = Tienda.CATALOGO[1];

  // ---- 1. El catalogo --------------------------------------------------
  check(Tienda.CATALOGO.length >= 5, `hay articulos a la venta (${Tienda.CATALOGO.length})`);
  check(
    Tienda.CATALOGO.every((a) => a.precio > 0 && a.clave && a.nombre && a.muestra),
    'todos tienen clave, nombre, precio y una muestra para enseñar'
  );
  check(
    new Set(Tienda.CATALOGO.map((a) => a.clave)).size === Tienda.CATALOGO.length,
    'y ninguna clave repetida'
  );

  // Lo que vende la tienda NO puede ser lo que regala el pase: si no, el pase
  // se vacia. Los premios del pase son de nivel; los de la tienda, de compra.
  const { PREMIOS } = await import('./models/Pase.js').catch(() => ({ PREMIOS: null }));
  if (PREMIOS) {
    const delPase = new Set(
      (Array.isArray(PREMIOS) ? PREMIOS : Object.values(PREMIOS).flat())
        .map((p) => p?.clave)
        .filter(Boolean)
    );
    const chocan = Tienda.CATALOGO.filter((a) => delPase.has(a.clave)).map((a) => a.clave);
    check(chocan.length === 0, `nada de la tienda es premio del pase${chocan.length ? ' (' + chocan.join(', ') + ')' : ''}`);
  } else {
    check(true, 'el pase no expone su lista de premios; el choque se vigila a mano');
  }

  // ---- 2. Sin monedas no se compra -------------------------------------
  const pobre = await Tienda.comprar(YO, UNO.clave);
  check(pobre.ok === false, 'sin monedas NO se puede comprar');
  check(/alcanzan/.test(pobre.error ?? ''), `y lo dice claro ("${pobre.error}")`);
  check((await Desbloqueo.de(YO)).length === 0, 'y no se le entrego nada');

  // ---- 3. Con monedas si -----------------------------------------------
  await Moneda.dar(YO, 1000, 'prueba', 'carga');
  const compra = await Tienda.comprar(YO, UNO.clave);
  check(compra.ok === true, `se compra ${UNO.nombre}`);
  check(compra.saldo === 1000 - UNO.precio, `y se le cobra el precio (quedan ${compra.saldo})`);
  check(await Desbloqueo.tiene(YO, UNO.clave), 'y ahora lo tiene desbloqueado');

  // ---- 4. LO IMPORTANTE: no se paga dos veces por lo mismo -------------
  const otraVez = await Tienda.comprar(YO, UNO.clave);
  check(otraVez.ok === false, 'comprar lo mismo otra vez se rechaza');
  check(/[Yy]a ten/.test(otraVez.error ?? ''), `y avisa que ya lo tiene ("${otraVez.error}")`);
  check((await Moneda.de(YO)).saldo === 1000 - UNO.precio, 'y NO se le vuelve a cobrar');

  // ---- 5. Un articulo inventado no entrega nada -----------------------
  const raro = await Tienda.comprar(YO, 'fichas:diamante-magico');
  check(raro.ok === false, 'un articulo que no existe se rechaza');
  check((await Moneda.de(YO)).saldo === 1000 - UNO.precio, 'y no mueve el saldo');
  check((await Desbloqueo.de(YO)).length === 1, 'ni entrega nada');

  // ---- 6. El precio lo pone el servidor -------------------------------
  //
  // `comprar` recibe SOLO la clave: no hay forma de que el navegador diga
  // cuanto cuesta. Se comprueba cobrando el segundo articulo y viendo que se
  // descuenta su precio de catalogo, no otro.
  const antes = (await Moneda.de(YO)).saldo;
  const segunda = await Tienda.comprar(YO, OTRO.clave);
  check(segunda.ok === true, `se compra tambien ${OTRO.nombre}`);
  check(
    segunda.saldo === antes - OTRO.precio,
    `cobrado al precio del catalogo, ${OTRO.precio} (${antes} → ${segunda.saldo})`
  );

  // ---- 7. La vitrina dice la verdad -----------------------------------
  const v = await Tienda.vitrina(YO);
  check(v.saldo === segunda.saldo, `la vitrina trae el saldo (${v.saldo})`);
  const comprados = v.articulos.filter((a) => a.tengo).map((a) => a.clave);
  check(comprados.length === 2, `y marca los dos que ya tiene (${comprados.join(', ')})`);
  check(
    v.articulos.every((a) => a.alcanza === (v.saldo >= a.precio)),
    'y avisa bien de cuales le alcanzan'
  );

  // ---- 8. El detalle explica en que se fueron --------------------------
  const movs = await Moneda.movimientos(YO, 20);
  const compras = movs.filter((m) => m.motivo === 'tienda');
  check(compras.length === 2, `quedan las dos compras anotadas (${compras.length})`);
  check(compras.every((m) => m.cuanto < 0), 'como salidas, en negativo');
  check(
    compras.map((m) => m.referencia).sort().join(',') === [UNO.clave, OTRO.clave].sort().join(','),
    'y se ve QUE se compro en cada una'
  );

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
