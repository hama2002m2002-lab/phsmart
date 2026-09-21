// 7amo.pos Ultra-Fast Offline Service Worker (v8)
// Enables 100% offline standalone POS operations with instantaneous (<100ms) startup and zero network latency stalls

const CACHE_NAME = '7amo-pos-cache-v8';
const DATA_CACHE_NAME = '7amo-pos-data-v8';

// Core assets to pre-cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg'
];

// Install Event: pre-cache application shell and activate immediately
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
            console.log('[SW] Cleaned legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: intercept network requests and serve from cache instantly when offline
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests; pass through others
  if (request.method !== 'GET') {
    return;
  }

  // Bypass ServiceWorker completely for Vite development assets to eliminate all startup latency
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('node_modules') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v')
  ) {
    return;
  }

  // 1. Navigation requests (HTML page loads, reloads, and desktop app launches)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // If offline, serve cached shell instantly (0ms)
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedShell) return cachedShell;
        }

        // When online or on first launch, attempt network with quick fallback
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
  // Instantaneous offline fallback: Never stall the UI waiting for network timeouts when offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        // If navigator is strictly offline, return instant synthetic JSON in 0ms
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return new Response(
            JSON.stringify({
              offline: true,
              status: 'offline',
              scans: [],
              success: true,
              message: '7amo.pos يعمل بدون إنترنت (أوفلاين) - العمليات محفوظة محلياً.'
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        // If online, use an ultra-fast 500ms abort controller so network stalls never cause UI freeze
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500);

        try {
          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch {
          clearTimeout(timeoutId);
          return new Response(
            JSON.stringify({
              offline: true,
              status: 'offline',
              scans: [],
              success: true,
              message: '7amo.pos وضع الأوفلاين السريع.'
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })()
    );
    return;
  }

  // 3. Static assets (JS chunks, CSS, fonts, SVG, wasm, images)
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
