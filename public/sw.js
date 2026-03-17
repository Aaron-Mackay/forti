// public/sw.js
const CACHE_NAME = 'forti-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove outdated caches from previous SW versions
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const {request} = event;

  // Only handle GET requests; leave mutations to the offline queue
  if (request.method !== 'GET') return;

  // Skip API calls — those are handled by the offline request queue
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests (HTML pages): network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Next.js static assets: cache-first (immutable, content-hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
});

// Background sync — replay queued mutations when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queued-requests') {
    event.waitUntil(syncRequests());
  }
});

async function syncRequests() {
  const db = await openDB();
  const tx = db.transaction('requests', 'readonly');
  const allRequests = await getAll(tx.objectStore('requests'));

  for (const req of allRequests) {
    await fetch(req.url, {
      method: req.method,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(req.body),
    });
  }

  const clearTx = db.transaction('requests', 'readwrite');
  clearTx.objectStore('requests').clear();
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineRequestsDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Wrap IDBRequest in a Promise (the original code had a bug: store.getAll() is not a Promise)
function getAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
