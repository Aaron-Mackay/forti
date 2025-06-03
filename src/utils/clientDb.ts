interface OfflineRequest {
  id?: number;
  url: string;
  method: string;
  body: any;
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineRequestsDB', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addRequest(data: Omit<OfflineRequest, 'id'>): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('requests', 'readwrite');
  const store = tx.objectStore('requests');
  await new Promise<void>((resolve, reject) => {
    const request = store.add(data);
    request.onsuccess = () => {
      resolve();
      console.log("add")
      window.dispatchEvent(new CustomEvent('queue-updated')); // ✅ dispatch event on add
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllRequests(): Promise<OfflineRequest[]> {
  const db = await openDatabase();
  const tx = db.transaction('requests', 'readonly');
  const store = tx.objectStore('requests');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearRequests(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('requests', 'readwrite');
  const store = tx.objectStore('requests');
  const clearReq = store.clear();
  clearReq.onsuccess = () => {
    console.trace("clear")
    window.dispatchEvent(new CustomEvent('queue-updated')); // ✅ dispatch on sync
  };
}
