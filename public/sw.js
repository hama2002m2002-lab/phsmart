// 7amo.pos Service Worker Cache Purge & Clean Reset
// Automatically unregisters legacy workers and purges all stale caches

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Pass through all network requests directly - zero interception
self.addEventListener('fetch', () => {
  return;
});
