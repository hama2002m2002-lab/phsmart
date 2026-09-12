// 7amo.pos Offline Service Worker
// Enables 100% offline standalone POS operations without active internet connection

const CACHE_NAME = '7amo-pos-cache-v3';
const DATA_CACHE_NAME = '7amo-pos-data-v3';

// Core assets to pre-cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg'
];

// Install Event: pre-cache application shell and take control immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching warning (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clean up legacy caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[SW] Removing deprecated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: intercept network requests and serve from cache when offline
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests; pass through others
  if (request.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (HTML page loads or reloads)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network unavailable, serve the cached index.html SPA shell
          return caches.match('/index.html').then((cachedIndex) => {
            if (cachedIndex) return cachedIndex;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 2. API requests (/api/*)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // When completely offline, return an offline JSON fallback instead of network error
        return new Response(
          JSON.stringify({
            offline: true,
            status: 'offline',
            message: '7amo.pos يعمل بدون إنترنت (أوفلاين) - تم حفظ كافة العمليات في قاعدة البيانات المحلية.'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 3. Static assets (JS chunks, CSS, fonts, SVG, images)
  // Stale-While-Revalidate: Return cached version immediately for speed, update in background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fetch fails, we rely completely on cachedResponse
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Support communication with client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
