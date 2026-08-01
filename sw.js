/* Caches the app shell so it opens instantly and survives a patchy
   supermarket signal. Firebase traffic is never cached. */
const CACHE = 'meal-planner-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest',
               './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;   // let Firebase and fonts through

  /* Always read config.js from the network, bypassing the HTTP cache as well.
     Skipping it here isn't enough on GitHub Pages: it serves max-age=600, so a
     plain pass-through can hand back a stale config for ten minutes after an
     edit — which looks exactly like a broken API key. */
  if (url.pathname.endsWith('config.js')){
    e.respondWith(fetch(e.request, { cache: 'reload' }));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
