// Devakusuma Farm OS - Progressive Web App Service Worker
const CACHE_NAME = "devakusuma-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg"
];

// Installs the service worker and caches basic entry shells
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache first, fall back to network strategy for UI shell, network only for firestore & API
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Do not intercept external APIs or Firestore requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache newly requested local sub-resources dynamically
        if (networkResponse && networkResponse.status === 200 && event.request.method === "GET") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline usage
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
