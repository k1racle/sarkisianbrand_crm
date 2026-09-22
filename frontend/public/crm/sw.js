/* Only public installation/offline resources are cached. CRM documents and API
 * responses (including authenticated GETs) are always network-only. */
const CACHE = 'sarkisian-crm-public-v3';
const OFFLINE = '/crm/pwa/offline.html';
const PUBLIC_RESOURCES = [OFFLINE, '/crm/pwa/offline.css', '/crm/pwa/offline.js', '/crm/pwa/icon-192.png', '/crm/pwa/icon-512.png', '/crm/pwa/icon-180.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_RESOURCES)));
  // A new worker waits for the previous windows to close; no forced draft reload.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('sarkisian-crm-public-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('Authorization')) return;
  if (PUBLIC_RESOURCES.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(request)));
    return;
  }
  if (request.mode === 'navigate' && url.pathname.startsWith('/crm/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () => {
      const cached = await (await caches.open(CACHE)).match(OFFLINE);
      return cached || new Response('Нет соединения. Подключитесь к интернету и обновите страницу.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
  }
});
