const CACHE_NAME = '7amo-pos-v5.0-instant-offline';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Skip waiting immediately when instructed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event: Pre-cache essential offline shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache warning:', err);
      });
    })
  );
});

// Activate event: Clean up previous caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Fast fetch with timeout to prevent hanging on offline/poor networks
function fetchWithTimeout(request, timeoutMs = 600) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Network timeout'));
    }, timeoutMs);

    fetch(request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

// Fetch event: Ultra-fast offline-first serving
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore non-http / chrome-extension URLs
  if (!url.protocol.startsWith('http')) return;

  // Ignore Firebase WebSocket and direct streaming connections
  if (url.pathname.includes('/google.firestore') || url.pathname.includes('/channel')) {
    return;
  }

  const isHtml = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');

  // 1. Navigation / HTML Requests: Fast Race with Cache Fallback
  if (isHtml) {
    event.respondWith(
      (async () => {
        // If offline, serve from cache instantly with zero network delay
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const cached = await caches.match('/index.html') || await caches.match('/');
          if (cached) return cached;
        }

        try {
          // Attempt network fetch with strict 400ms timeout
          const networkResponse = await fetchWithTimeout(request, 400);
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return networkResponse;
          }
        } catch {
          // Network timed out or offline -> serve cached index.html immediately
        }

        const cachedHtml = await caches.match('/index.html') || await caches.match('/') || await caches.match(request);
        if (cachedHtml) return cachedHtml;

        // Fallback network attempt if not in cache
        return fetch(request).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }));
      })()
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Fonts, Images): Stale-While-Revalidate / Cache-First
  // This ensures instant (<5ms) loading of all scripts and styles when offline
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      // If cached, return immediately for instant offline boot
      if (cachedResponse) {
        // Asynchronously revalidate in background if online
        if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      // If not in cache, fetch from network and store in cache
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      } catch (err) {
        // If it's an image or script, try fallback
        return cachedResponse || new Response('Network error', { status: 408 });
      }
    })()
  );
});
