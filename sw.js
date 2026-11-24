// Trabajador de servicio de la aplicación instalable (H6.1; RF-09, parte local; RNF-10).
// Al instalarse guarda todos los archivos de sw-archivos.json, así la aplicación arranca sin red.
// Después, cada pedido va primero a la red (para tener siempre la versión publicada) y, si no hay
// red o tarda más de 3 s, se sirve lo guardado. Nunca guarda datos de niños: esos viven cifrados
// en IndexedDB (src/almacen.js); aquí solo están los archivos de la aplicación.
const CACHE = 'autipal-archivos';
const ESPERA_MS = 3000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const { archivos } = await (await fetch('sw-archivos.json', { cache: 'no-store' })).json();
      const cache = await caches.open(CACHE);
      await cache.addAll(archivos);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('lento')), ESPERA_MS))]);
        if (res.ok) await cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req, { ignoreSearch: true })) ?? Response.error();
      }
    })(),
  );
});
