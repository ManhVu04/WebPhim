// Service Worker for caching media and API responses
// Place in public/sw.js

const CACHE_NAME = 'webphim-v1';
const IMAGE_CACHE = 'webphim-images-v1';

// Cache patterns
const CACHE_URLS = [
  /* cached on demand */
];

// Don't cache these
const SKIP_CACHE = [
  '/api/auth/',
  '/api/history',
  '/api/favorites',
  '/api/comments',
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== IMAGE_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API auth endpoints
  if (SKIP_CACHE.some((path) => url.pathname.includes(path))) {
    return;
  }

  // Image CDN caching (wsrv, ophim, tmdb)
  if (
    url.href.includes('wsrv.nl') ||
    url.href.includes('img.ophim') ||
    url.href.includes('image.tmdb.org')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // API responses (movie data)
  if (url.pathname.startsWith('/api/ophim/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetched = fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
          return cached || fetched;
        });
      })
    );
    return;
  }
});
