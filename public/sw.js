const CACHE = 'nexus-arena-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  // Les éléments audio/vidéo utilisent des requêtes HTTP Range. Elles renvoient
  // une réponse partielle 206 que l'API Cache n'autorise pas à stocker.
  // On les laisse donc passer directement vers le réseau.
  if (request.headers.has('range')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;

      try {
        const response = await fetch(request);

        // Ne mettre en cache que des réponses complètes et valides. Cela exclut
        // notamment les 206, les erreurs et les réponses opaques non vérifiables.
        if (response.ok && response.status === 200 && response.type !== 'opaque') {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }

        return response;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })
  );
});
