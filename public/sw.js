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

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Forti', body: event.data.text() };
  }
  const title = payload.title ?? 'Forti';
  const options = {
    body: payload.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url ?? '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
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
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(req.body),
      });
      // Only delete requests that the server accepted; leave failures for next sync
      if (response.ok && req.id !== undefined) {
        const delTx = db.transaction('requests', 'readwrite');
        delTx.objectStore('requests').delete(req.id);
      }
    } catch {
      // Network failure — leave in queue for next sync attempt
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineRequestsDB', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', {keyPath: 'id', autoIncrement: true});
      }
      if (!db.objectStoreNames.contains('userDataCache')) {
        db.createObjectStore('userDataCache', {keyPath: 'userId'});
      }
      if (!db.objectStoreNames.contains('eventsCache')) {
        db.createObjectStore('eventsCache', {keyPath: 'userId'});
      }
      if (!db.objectStoreNames.contains('dayMetricsCache')) {
        db.createObjectStore('dayMetricsCache', {keyPath: 'userId'});
      }
    };
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
