const CACHE = 'nexus-arena-v4';
const SHELL = ['./manifest.webmanifest', './icon.svg'];

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

  // Audio et vidéo demandent souvent des morceaux du fichier via HTTP Range.
  // Une réponse 206 ne doit jamais être placée dans Cache Storage.
  if (request.headers.has('range')) {
    event.respondWith(fetch(request));
    return;
  }

  // Toujours chercher la dernière version du document principal sur le réseau.
  // Cela évite qu'une ancienne build GitHub Pages reste affichée indéfiniment.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match('./index.html').then((cached) => cached || Response.error()))
    );
    return;
  }

  // Les assets versionnés de Vite peuvent rester en cache. En cas d'absence,
  // on les télécharge puis on conserve uniquement les réponses complètes 200.
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
