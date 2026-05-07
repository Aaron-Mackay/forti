import {addRequest, deleteRequest, getAllRequests, openDatabase} from './clientDb';

interface OfflineRequest {
  id?: number;
  url: string;
  method: string;
  body: Record<string, unknown>;
}

export type QueueOrSendResult = {
  queued: boolean;
  response?: Response;
  queueId?: number;
};

const MAX_RETRIES = 3;

// Prevent concurrent sync runs (multiple online/visibilitychange/pageshow triggers
// firing close together can otherwise replay the same queued mutations in parallel)
let syncInProgress = false;

export async function retryFetch(req: OfflineRequest, retries = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(req.body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (err) {
      // 4xx responses are client errors — retrying won't help
      const is4xx = err instanceof Error && /^HTTP 4\d\d$/.test(err.message);
      if (is4xx) throw err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, 2 ** i * 500 + Math.random() * 200)); // exponential backoff with jitter
      }
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

export async function cancelQueuedRequest(queueId: number): Promise<void> {
  await deleteRequest(queueId);
}

export async function queueOrSendRequest(url: string, method: string, body: Record<string, unknown>): Promise<QueueOrSendResult> {
  const req: OfflineRequest = {url, method, body};


  if (!navigator.onLine) {
    const queueId = await addRequest(req);

    // Try to register background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      try {
        // @ts-expect-error sync is not yet in the serviceworker definition
        await (reg).sync.register('sync-queued-requests');
      } catch (err) {
        console.warn('Background sync registration failed:', err);
      }
    }
    return {queued: true, queueId};
  } else {
    const response = await retryFetch(req);
    return {queued: false, response};
  }
}

export async function queueOrSendRequestJson<T>(
  url: string,
  method: string,
  body: Record<string, unknown>,
): Promise<{queued: boolean; data: T | null; queueId?: number}> {
  const {queued, response, queueId} = await queueOrSendRequest(url, method, body);
  if (queued || !response) return {queued: true, data: null, queueId};
  const data = await response.json() as T;
  return {queued: false, data};
}


export async function syncQueuedRequests(): Promise<void> {
  if (!navigator.onLine || syncInProgress) return;
  syncInProgress = true;

  try {
    const requests = await getAllRequests();
    let failCount = 0;

    for (const req of requests) {
      try {
        await retryFetch(req);
        if (req.id !== undefined) await deleteRequest(req.id);
      } catch (err) {
        const is4xx = err instanceof Error && /^HTTP 4\d\d$/.test(err.message);
        if (is4xx) {
          // Permanently invalid — drop from queue so it never blocks future syncs
          if (req.id !== undefined) await deleteRequest(req.id);
          console.warn('Dropping non-retryable queued request:', req.url, err.message);
        } else {
          failCount++;
          console.error('Failed to send queued request:', req, err);
        }
      }
    }

    if (requests.length) {
      console.log(`${requests.length - failCount}/${requests.length} queued request(s) synced`);
    }

    if (failCount > 0) {
      window.dispatchEvent(new CustomEvent('sync-failed', {detail: {count: failCount}}));
    }
  } finally {
    syncInProgress = false;
  }
}
