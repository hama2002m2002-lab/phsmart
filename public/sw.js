// 7amo.pos Offline Service Worker
// Enables 100% offline standalone POS operations with instantaneous offline startup

const CACHE_NAME = '7amo-pos-cache-v4';
const DATA_CACHE_NAME = '7amo-pos-data-v4';

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

// Activate Event: clean up legacy caches and claim all clients immediately
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

  // 1. Navigation requests (HTML page loads, reloads, and desktop app launches)
  // Cache-First with background revalidation: Opens INSTANTLY (0ms) offline without waiting for network timeouts
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Look up cached shell immediately
        const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
        
        // If we have the cached index shell, serve it immediately!
        if (cachedShell) {
          // In the background, if online, update the cache quietly
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const clone = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
                }
              })
              .catch(() => {});
          }
          return cachedShell;
        }

        // If not cached yet (first visit), attempt fetch with an aggressive 1.2s timeout to prevent offline hang
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', clone);
          }
          return networkResponse;
        } catch (err) {
          const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
          if (fallback) return fallback;
          return new Response('7amo.pos Offline Ready', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      })()
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
  // Cache-First with background revalidation: returns cached chunk in <1ms
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Background cache update for freshest assets when online
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      // If not in cache, fetch and store
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response('', { status: 408, statusText: 'Offline Asset' });
        });
    })
  );
});

// Support communication with client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
