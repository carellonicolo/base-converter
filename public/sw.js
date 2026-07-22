/* Service worker Base Converter — conservativo (stesso schema di VLSM).
 *
 * Regole:
 *  - /api/* NON viene MAI messo in cache (integrità di verifiche, sessioni, SSO).
 *  - Navigazioni (SPA): network-first, con fallback alla home in cache se offline.
 *  - Asset statici hashati (/assets/*) e altri GET same-origin: stale-while-revalidate
 *    (i nomi file cambiano ad ogni deploy → nessun rischio di servire JS vecchio).
 *  - Bump di CACHE_VERSION ⇒ le cache vecchie vengono eliminate all'activate.
 */
const CACHE_VERSION = 'bc-cache-v1';
const APP_SHELL = ['/', '/favicon.svg', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // solo same-origin
  if (url.pathname.startsWith('/api/')) return;       // mai cache delle API

  // Navigazioni SPA: prova la rete, altrimenti la home in cache (offline).
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  // Altri GET same-origin (asset hashati, icone…): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
