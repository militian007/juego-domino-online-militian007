// El service worker: lo que hace falta para que el navegador OFREZCA instalar
// la app.
//
// Chrome no muestra la opcion de instalar si la pagina no tiene un service
// worker con un manejador de `fetch`. Ese era el motivo de que nunca apareciera
// la opcion: manifiesto habia, iconos habia, service worker no.
//
// ## Que NO hace
//
// No guarda copias de los archivos del juego. Se hizo a proposito: el juego se
// despliega varias veces al dia, y un service worker que guarda copias es la
// forma mas comun de que alguien se quede con una version vieja pegada sin
// entender por que. Lo unico que guarda es la pagina de arranque, y solo para
// poder contestar algo cuando no hay internet.

const CACHE = 'domino-arranque-v1';

self.addEventListener('install', (evento) => {
  // Se activa de una, sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
  evento.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;

  // Solo se toca la navegacion (abrir la pagina). Todo lo demas va derecho a la
  // red, para que nadie se quede con una version vieja.
  if (pedido.mode !== 'navigate') return;

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
