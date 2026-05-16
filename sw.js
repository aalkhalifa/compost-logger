const CACHE = ‘compost-v4’;
const ASSETS = [
‘/compost-logger/’,
‘/compost-logger/index.html’,
‘/compost-logger/manifest.json’,
‘/compost-logger/icon-192.png’,
‘/compost-logger/icon-512.png’
];

self.addEventListener(‘install’, e => {
e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
self.skipWaiting();
});

self.addEventListener(‘activate’, e => {
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
)
);
self.clients.claim();
});

// NETWORK-FIRST: always try network first, fall back to cache only when offline.
// This is the permanent fix for the “stuck on old version” problem.
self.addEventListener(‘fetch’, e => {
if (e.request.method !== ‘GET’) return;
e.respondWith(
fetch(e.request).then(res => {
if (res.ok) {
const clone = res.clone();
caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
}
return res;
}).catch(() => caches.match(e.request))
);
});
