/**
 * Solarpunk Utopia Platform - Service Worker
 *
 * Offline-first service worker optimized for:
 * - Low resource devices (Android 5+)
 * - Battery efficiency
 * - Minimal network usage
 * - Resilient offline operation
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `solarpunk-${CACHE_VERSION}`;

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/scripts/app.js',
  '/styles/main.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Maximum cache size to avoid filling storage on old devices (in MB)
const MAX_CACHE_SIZE_MB = 50;

/**
 * Install event - cache static assets
 * Optimized to be fast on slow devices
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        // Use addAll for atomic caching - all or nothing
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 * Optimized to free storage on constrained devices
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Remove old caches
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - offline-first strategy
 *
 * Strategy:
 * 1. Try cache first (fast on slow devices)
 * 2. Fall back to network if not cached
 * 3. Cache successful network responses for future
 * 4. Return offline fallback if both fail
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests to avoid CORS issues
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          // For HTML pages, also fetch in background to update cache
          if (request.mode === 'navigate') {
            fetchAndCache(request);
          }
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetchAndCache(request);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Fetch failed:', error);
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

/**
 * Fetch from network and cache the response
 * Implements cache size limits for constrained devices
 */
function fetchAndCache(request) {
  return fetch(request)
    .then((response) => {
      // Only cache successful responses
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      // Clone response before caching (can only read once)
      const responseToCache = response.clone();

      caches.open(CACHE_NAME)
        .then((cache) => {
          // Check cache size before adding
          checkCacheSize(cache).then((sizeOk) => {
            if (sizeOk) {
              cache.put(request, responseToCache);
            } else {
              console.warn('[ServiceWorker] Cache size limit reached, not caching:', request.url);
            }
          });
        });

      return response;
    });
}

/**
 * Check if cache size is within limits
 * Prevents filling storage on devices with limited space
 */
async function checkCacheSize(cache) {
  try {
    const keys = await cache.keys();

    // Estimate size (rough approximation)
    // Actual implementation would sum response sizes
    const estimatedSizeMB = keys.length * 0.1; // Assume ~100KB per resource

    if (estimatedSizeMB > MAX_CACHE_SIZE_MB) {
      // Remove oldest entries if over limit
      const keysToDelete = keys.slice(0, Math.ceil(keys.length * 0.2)); // Remove 20%
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
      return true;
    }

    return estimatedSizeMB < MAX_CACHE_SIZE_MB;
  } catch (error) {
    console.error('[ServiceWorker] Cache size check failed:', error);
    return true; // Fail open
  }
}

/**
 * Background Sync - for queued operations when offline
 * This enables offline-first writes that sync when connectivity returns
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);

  if (event.tag === 'sync-community-data') {
    event.waitUntil(syncCommunityData());
  }
});

/**
 * Sync community data with server/peers
 * Batched to minimize battery usage
 */
async function syncCommunityData() {
  try {
    // This will be implemented with actual sync logic
    // For now, just log
    console.log('[ServiceWorker] Syncing community data...');

    // Future: Send queued operations to server/peers
    // Future: Implement CRDT merge operations

    return Promise.resolve();
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
    throw error; // Retry sync later
  }
}

/**
 * Message handler for communication with main app
 * Enables app to control service worker behavior
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
        .then(() => {
          console.log('[ServiceWorker] Cache cleared');
          return self.clients.claim();
        })
    );
  }
});

/**
 * Push notification handler
 * For community alerts and updates
 * Optimized to minimize battery drain
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200], // Minimal vibration to save battery
      data: data.url,
      requireInteraction: data.urgent || false
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[ServiceWorker] Push notification failed:', error);
  }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

console.log('[ServiceWorker] Loaded');
