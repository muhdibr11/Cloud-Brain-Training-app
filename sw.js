// Offline cache. Bump VERSION whenever any file changes so phones pick up the update.
const VERSION = 'cloud-v2';
const FILES = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  "./data/concepts.js",
  "./data/estimate.js",
  "./data/judgement.js",
  "./data/prompts.js",
  "./js/app.js",
  "./js/arith.js",
  "./js/lib.js",
  "./js/scoring.js",
  "./js/srs.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/views/bench.js",
  "./js/views/dives.js",
  "./js/views/estimate.js",
  "./js/views/forecasts.js",
  "./js/views/judgement.js",
  "./js/views/library.js",
  "./js/views/practice.js",
  "./js/views/progress.js",
  "./js/views/review.js",
  "./js/views/speaking.js",
  "./js/views/sprint.js",
  "./js/views/today.js",
  "./js/views/writing.js",
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
// Network first so updates arrive when online; cache when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
