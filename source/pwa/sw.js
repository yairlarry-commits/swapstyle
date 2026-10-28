// SwapStyle service worker: makes the app installable and opens instantly, even offline.
// Paths are relative to where the app lives (works at a domain root or in a sub-folder like /swapstyle/).
const CACHE = 'swapstyle-v7';
const BASE = self.registration.scope;
const SHELL = ['', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'].map((p) => new URL(p, BASE).href);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const page = new URL('index.html', BASE).href;
  // the app page: network first (to get updates), cached copy when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(page, copy));
          return res;
        })
        .catch(() => caches.match(page))
    );
    return;
  }
  // own static files: cache first
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
  // everything else (Supabase, fonts): straight to the network
});
