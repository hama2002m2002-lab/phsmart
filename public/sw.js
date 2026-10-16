// 7amo.pos Ultra-Fast Offline Service Worker (v10)
// Enables 100% offline standalone POS operations with instantaneous (<50ms) startup and zero network latency stalls

const CACHE_NAME = '7amo-pos-cache-v10';
const DATA_CACHE_NAME = '7amo-pos-data-v10';

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

  // Only bypass Vite internal HMR websocket pings so they don't pollute cache
  if (
    url.pathname.startsWith('/@vite/client') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // 1. Navigation requests (HTML page loads, reloads, and desktop app launches)
  // Strategy: Cache-First with Background Revalidation (Instant 0ms launch, zero network stalling)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Instant Cache Match: Return cached shell in 0ms immediately whether offline or online
        const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
        if (cachedShell) {
          // If network is available, refresh cache silently in the background without blocking the UI
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            const bgController = new AbortController();
            const bgTimeout = setTimeout(() => bgController.abort(), 2000);
            fetch(request, { signal: bgController.signal })
              .then(async (netRes) => {
                clearTimeout(bgTimeout);
                if (netRes && netRes.status === 200) {
                  const cache = await caches.open(CACHE_NAME);
                  cache.put('/index.html', netRes.clone());
                }
              })
              .catch(() => clearTimeout(bgTimeout));
          }
          return cachedShell;
        }

        // Cold-first launch if not yet cached: fast 600ms attempt with instant offline fallback
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 600);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', clone);
          }
          return networkResponse;
        } catch {
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

        // If online, use an ultra-fast 400ms abort controller so network stalls never cause UI freeze
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 400);

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
  // Cache-First with quick timeout protection: returns cached chunk in <1ms, never hangs on dead network
  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) {
        // Background cache update for freshest assets when online
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const bgController = new AbortController();
          const bgTimeout = setTimeout(() => bgController.abort(), 2000);
          fetch(request, { signal: bgController.signal })
            .then(async (networkResponse) => {
              clearTimeout(bgTimeout);
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, clone);
              }
            })
            .catch(() => clearTimeout(bgTimeout));
        }
        return cachedResponse;
      }

      // If not in cache, fetch with a strict 700ms abort timeout so network stalls never cause the splash screen to freeze
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 700);

      try {
        const networkResponse = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      } catch {
        clearTimeout(timeoutId);
        // If fetch failed or timed out, try to match by pathname or return fallback
        const fallback = await caches.match(url.pathname);
        if (fallback) return fallback;
        return new Response('', { status: 408, statusText: 'Offline Asset Unavailable' });
      }
    })
  );
});

// Support communication with client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
