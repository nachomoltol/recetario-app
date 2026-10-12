const CACHE_NAME = 'recetario-pwa-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
];

// Instalación resiliente: nunca falla si algún activo individual devuelve redirect o error
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of STATIC_ASSETS) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
          }
        } catch {
          // Ignorar silenciosamente si no está disponible de inmediato
        }
      }
    })
  );
  self.skipWaiting();
});

// Activación: purgar cachés antiguos y reclamar clientes inmediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Estrategia Network-First para datos y Cache-First para iconos estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar peticiones que no sean GET o llamadas a Supabase / APIs externas
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Activos estáticos de iconos: Cache first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkRes;
          })
        );
      })
    );
    return;
  }

  // Rutas y navegación: Network first con fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.mode !== 'navigate') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const cachedHome = await caches.match('/recipes');
          if (cachedHome) return cachedHome;
        }
        return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
      })
  );
});

// Control de actualizaciones
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
