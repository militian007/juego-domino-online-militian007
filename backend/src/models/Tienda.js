import * as Moneda from './Moneda.js';
import * as Desbloqueo from './Desbloqueo.js';

/**
 * La tienda del club (§141).
 *
 * ## Que vende, y por que eso y no otra cosa
 *
 * **Solo cosas que NO da el pase de batalla.** El pase es el sistema de
 * recompensas del juego y funciona; una tienda que venda sus premios lo vacia.
 * Por eso la tienda espero hasta que hubo arte propio: tres pintas de fichas
 * (marmol, jade, madera) y dos paños (granate, azul noche).
 *
 * ## El catalogo vive AQUI, no en la pantalla
 *
 * Los precios los pone el servidor. Si vivieran en el navegador, cualquiera
 * compraria el marmol por una moneda editando su telefono (CLAUDE.md regla 8).
 * La pantalla pide el catalogo y lo dibuja; no decide nada.
 *
 * ## De donde salen los precios
 *
 * Una partida entre personas deja entre 5 y 45 monedas. A **300** por artefacto,
 * son entre siete y sesenta partidas: se siente ganado sin ser eterno. Cuando
 * haya datos de cuanto juega la gente de verdad, se vuelve a mirar.
 */

const PRECIO = 300;

export const CATALOGO = [
  {
    clave: 'fichas:marmol',
    nombre: 'Fichas de mármol',
    descripcion: 'Mármol blanco con vetas grises y puntos de ónix.',
    tipo: 'fichas',
    precio: PRECIO,
    muestra: '/tiles-marmol/tile_3_5.png'
  },
  {
    clave: 'fichas:jade',
    nombre: 'Fichas de jade',
    descripcion: 'Jade verde translúcido con puntos de oro viejo.',
    tipo: 'fichas',
    precio: PRECIO,
    muestra: '/tiles-jade/tile_3_5.png'
  },
  {
    clave: 'fichas:madera',
    nombre: 'Fichas de madera',
    descripcion: 'Madera veteada con puntos de marfil.',
    tipo: 'fichas',
    precio: PRECIO,
    muestra: '/tiles-madera/tile_3_5.png'
  },
  {
    clave: 'pano:granate',
    nombre: 'Paño granate',
    descripcion: 'El mismo tejido de siempre, en rojo borgoña.',
    tipo: 'pano',
    precio: PRECIO,
    muestra: '/pano-granate.webp'
  },
  {
    clave: 'pano:azul',
    nombre: 'Paño azul noche',
    descripcion: 'El mismo tejido de siempre, en azul profundo.',
    tipo: 'pano',
    precio: PRECIO,
    muestra: '/pano-azul.webp'
  }
];

const porClave = (clave) => CATALOGO.find((a) => a.clave === clave) || null;

/** El catalogo con lo que esta persona ya tiene, y cuanto le queda. */
export const vitrina = async (userId) => {
  const [mios, monedas] = await Promise.all([
    Desbloqueo.de(userId),
    Moneda.de(userId)
  ]);

  return {
    saldo: monedas.saldo,
    articulos: CATALOGO.map((a) => ({
      ...a,
      tengo: mios.includes(a.clave),
      alcanza: monedas.saldo >= a.precio
    }))
  };
};

/**
 * Comprar.
 *
 * El orden importa y no es casual: **primero se cobra y despues se entrega.**
 * Al reves, un fallo entre las dos regala el articulo. Asi, el peor caso es que
 * alguien pague y no reciba, que se arregla mirando el detalle de movimientos;
 * el caso contrario no se puede arreglar con nadie.
 *
 * Cobrar lleva la clave del articulo como referencia, asi que el propio libro de
 * monedas impide pagar dos veces por lo mismo.
 */
export const comprar = async (userId, clave) => {
  const articulo = porClave(clave);
  if (!articulo) return { ok: false, error: 'Ese artículo no existe' };

  if (await Desbloqueo.tiene(userId, clave)) {
    return { ok: false, error: 'Ya tenés eso' };
  }

  const pago = await Moneda.cobrar(userId, articulo.precio, 'tienda', clave);
  if (!pago.ok) return { ok: false, error: pago.error, saldo: pago.saldo };

  await Desbloqueo.dar(userId, clave);

  return { ok: true, clave, saldo: pago.saldo, nombre: articulo.nombre };
};
