// Service worker — makes the installed app work fully offline.
//
// Strategy:
//   • navigations  → network-first (show updates when online), fall back to the
//     cached index.html when offline.
//   • other assets → cache-first with runtime population, so versioned files
//     (script.js?v=…, styles.css?v=…) and the woff2 fonts get cached on first
//     load and served offline afterwards.
//
// Bump CACHE on release to evict the old shell.
const CACHE = 'whist-v2-20260813c';

// Same-origin core precached on install. Relative paths keep this working under
// the GitHub Pages subpath (/israeli-whist/).
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './fonts/fonts.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // only our own files

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
