const CACHE_NAME = 'miga-pwa-v5.4';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/apple-touch-icon.png',
  '/miga-logo.svg',
];

// Install: precache essential shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache asset fetch failure:', err);
      });
    })
  );
});

// Activate: clean up old caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Borrando caché obsoleta:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener para forzar skipWaiting desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Network-first seguro en iOS/WebKit (nunca devuelve null a respondWith)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignorar peticiones no-GET o externas (Supabase, Google GenAI, AdMob, etc.)
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // No interceptar rutas de API ni payloads dinámicos RSC / Prefetch de Next.js
  // para evitar que microcortes de WebKit al cambiar de app disparen "TypeError: Load failed"
  if (
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1'
  ) {
    return;
  }

  // Network-First para recursos locales con fallback que jamás devuelve null
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        try {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          if (request.mode === 'navigate') {
            const rootShell = await caches.match('/');
            if (rootShell) return rootShell;
          }
        } catch {}

        // En WebKit/iOS, devolver null en respondWith provoca un crash "TypeError: Load failed".
        // Devolvemos siempre una instancia Response válida.
        return new Response('Conexión interrumpida temporalmente.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
