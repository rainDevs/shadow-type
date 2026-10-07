// Shadow Type service worker: offline-first app shell + sprites.
// Versioned cache so updates activate cleanly (skipWaiting + claim).
// Training (bundled word lists) works fully offline; Arena PVP needs
// network and fails through to the app's own retry/error UI.

const CACHE = 'shadow-type-v1';
const CORE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function staleWhileRevalidate(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        // Cache good same-origin responses and CORS-enabled font/CDN files.
        if (response && (response.status === 200 || response.type === 'opaque')) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    }),
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Navigations: network first so updates land, offline falls back to shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy).catch(() => {}));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  // Sprites, hashed JS/CSS, fonts: serve cached, refresh in background.
  if (url.origin === self.location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
