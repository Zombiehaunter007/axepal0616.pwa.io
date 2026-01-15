const CACHE_NAME = 'tim-pwa-v2';
const CORE_ASSETS = [
  './',
  'index.html',
  'app.js',
  'manifest.webmanifest',
  'images/tim.jpg',
  'images/icons/tim192.png',
  'images/icons/tim512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined)))
    )
  );
  self.clients.claim();
});

// Strategy: Network-first for navigation/HTML; cache-first for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Cache-first with background refresh (stale-while-revalidate style)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Refresh cache in the background (non-blocking)
        fetch(req)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          })
          .catch(() => {});
        return cached;
      }

      // If not in cache, fetch from network and cache it
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          return res;
        })
        .catch(() => {
          // For navigations, fall back to cached index.html when offline
          if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
            return caches.match('index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
