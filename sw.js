const CACHE = 'compost-logger-v3.79v';
const ASSETS = [
'/compost-logger/',
'/compost-logger/index.html',
'/compost-logger/manifest.json',
'/compost-logger/icon-192.png',
'/compost-logger/icon-512.png'
];

self.addEventListener('install', e => {
e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
self.skipWaiting();
});

self.addEventListener('activate', e => {
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
)
);
self.clients.claim();
});

// Hosts serving STATIC assets that are safe to cache for offline use (chart/PDF/XLSX
// libraries and fonts). Everything else cross-origin is an API and must never be cached.
const STATIC_HOSTS = [
'cdn.jsdelivr.net',
'cdnjs.cloudflare.com',
'unpkg.com',
'fonts.googleapis.com',
'fonts.gstatic.com'
];

function isCacheable(url) {
// Same-origin app shell: always cacheable.
if (url.origin === self.location.origin) return true;
// Cross-origin: only the static asset CDNs above.
return STATIC_HOSTS.indexOf(url.hostname) >= 0;
}

// NETWORK-FIRST: always try network first, fall back to cache only when offline.
// This is the permanent fix for the "stuck on old version" problem.
//
// CRITICAL (v3.79u): API requests must pass through untouched. This handler used to
// intercept EVERY GET, including cross-origin ones, and cache successful responses.
// That silently broke PocketBase sync: pbLoad's "does this user have a vault?" GET was
// cached while the answer was still "no", and any later network hiccup served that stale
// empty list from cache. pbLoad then took its create-a-vault branch, which the unique
// index rejected with a 400 - forever, because pbVaultId never got set. Symptom was a
// permanent SYNC ERROR that no amount of retrying could clear.
// The same bug would have staled Google Drive and Open-Meteo responses.
self.addEventListener('fetch', e => {
if (e.request.method !== 'GET') return;
let url;
try { url = new URL(e.request.url); } catch (err) { return; }
// Not cacheable => do not call respondWith at all, so the request goes straight to the
// network with no service-worker involvement.
if (!isCacheable(url)) return;
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
