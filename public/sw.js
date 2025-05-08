// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queued-requests') {
    event.waitUntil(syncRequests());
  }
});

async function syncRequests() {
  const db = await openDB();
  const tx = db.transaction('requests', 'readonly');
  const store = tx.objectStore('requests');
  const allRequests = await store.getAll();

  for (const req of allRequests) {
    await fetch(req.url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
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
