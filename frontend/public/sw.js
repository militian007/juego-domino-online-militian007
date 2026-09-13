// El service worker: lo que hace falta para que el navegador OFREZCA instalar
// la app.
//
// Chrome no muestra la opcion de instalar si la pagina no tiene un service
// worker con un manejador de `fetch`. Ese era el motivo de que nunca apareciera
// la opcion: manifiesto habia, iconos habia, service worker no.
//
// ## Que NO hace
//
// No guarda copias del CODIGO del juego (la pagina, el JS, el CSS). Se hizo a
// proposito: el juego se despliega varias veces al dia, y un service worker
// que guarda copias es la forma mas comun de que alguien se quede con una
// version vieja pegada sin entender por que. De la pagina guarda solo la de
// arranque, y solo para poder contestar algo cuando no hay internet.
//
// ## Lo unico que si guarda: las imagenes y los sonidos (§151)
//
// Las fichas, los carteles, los sonidos, los avatares y los iconos no cambian
// con cada despliegue, y cuando cambian, cambian de direccion (las fichas llevan
// `?v=N`, ver VERSION_FICHAS). Esos se guardan en una cache aparte, con nombre
// versionado, y se sirven desde ahi sin pasar por la red: la segunda mesa no
// vuelve a pedir ni una ficha. Si algun dia cambia un dibujo SIN cambiar de
// direccion, hay que subir el numero de `CACHE_ASSETS`, y la cache vieja se
// borra sola al activarse la nueva version.

const CACHE = 'domino-arranque-v1';
const CACHE_ASSETS = 'domino-assets-v1';
const CACHES_VIVAS = [CACHE, CACHE_ASSETS];

// Que rutas se guardan como inmutables. Solo las de este mismo origen.
const ES_ASSET = /^\/(tiles[^/]*|carteles|sonidos|avatares|iconos)\//;

self.addEventListener('install', (evento) => {
  // Se activa de una, sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
  evento.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => !CACHES_VIVAS.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la cache; si no esta, la red, y se guarda solo lo que llego bien
// (un 200 entero: un pedazo 206 o un 404 no se guardan).
async function desdeCacheOLaRed(pedido) {
  const cache = await caches.open(CACHE_ASSETS);
  const guardada = await cache.match(pedido);
  if (guardada) return guardada;
  const respuesta = await fetch(pedido);
  if (respuesta.status === 200) {
    cache.put(pedido, respuesta.clone()).catch(() => {});
  }
  return respuesta;
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;

  if (pedido.mode !== 'navigate') {
    // Las imagenes y los sonidos se sirven desde la cache. Todo lo demas (el
    // JS, el CSS, la API) va derecho a la red, para que nadie se quede con una
    // version vieja.
    const url = new URL(pedido.url);
    if (pedido.method === 'GET' && url.origin === self.location.origin && ES_ASSET.test(url.pathname)) {
      evento.respondWith(desdeCacheOLaRed(pedido));
    }
    return;
  }

  evento.respondWith(
    fetch(pedido)
      .then((respuesta) => {
        // Se guarda la ultima que funciono, para el dia que no haya internet.
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put('/', copia)).catch(() => {});
        return respuesta;
      })
      .catch(() => caches.match('/').then((r) => r || Response.error()))
  );
});
