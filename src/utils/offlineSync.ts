import {addRequest, clearRequests, getAllRequests, openDatabase} from './clientDb';

import {SetUpdatePayload} from "@/types/dataTypes";

interface OfflineRequest {
  url: string;
  method: string;
  body: SetUpdatePayload;
}

const MAX_RETRIES = 3;

async function retryFetch(req: OfflineRequest, retries = MAX_RETRIES): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(req.body),
      });
      return;
    } catch {
      await new Promise((res) => setTimeout(res, 2 ** i * 500)); // exponential backoff
    }
  }
  throw new Error('Max retries reached');
}

export async function getQueuedRequests(): Promise<number> {
  const db = await openDatabase();
  const tx = db.transaction('requests', 'readonly');
  const store = tx.objectStore('requests');

  return new Promise((resolve, reject) => {
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


export async function queueOrSendRequest(url: string, method: string, body: SetUpdatePayload): Promise<void> {
  const req: OfflineRequest = {url, method, body};


  if (!navigator.onLine) {
    await addRequest(req);

    // Try to register background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      try {
        // @ts-expect-error sync is not yet in the serviceworker definition
        await (reg).sync.register('sync-queued-requests');
      } catch (err) {
        console.error(err)
        console.warn('Background sync registration failed:', err);
      }
    }
  } else {
    await retryFetch(req);
  }
}


export async function syncQueuedRequests(): Promise<void> {
  if (!navigator.onLine) return;

  const requests = await getAllRequests();
  for (const req of requests) {
    try {
      await retryFetch(req);
    } catch (err) {
      console.error(err)
      console.error('Failed to send queued request:', req, err);
    }
  }

  if (requests.length) {
    console.log(`${requests.length} queued request(s) synced`);
  }

  await clearRequests();
}