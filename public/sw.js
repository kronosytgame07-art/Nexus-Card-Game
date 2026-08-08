const CACHE = 'nexus-arena-v20';
const SHELL = ['./manifest.webmanifest', './icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.headers.has('range')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html').then((cached) => cached || Response.error())));
    return;
  }

  const url = new URL(request.url);
  const isLiveArtwork = url.pathname.includes('/cards/') || url.pathname.includes('/boosters/');

  // Les illustrations changent souvent pendant le développement. Elles passent
  // donc en network-first pour ne jamais afficher une ancienne image conservée
  // sous le même nom par la PWA. Le cache ne sert que de secours hors-ligne.
  if (isLiveArtwork) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.status === 200 && response.type !== 'opaque') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
      }
      return response;
    })
  );
});
