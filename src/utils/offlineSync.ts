import {addRequest, getAllRequests, clearRequests, openDatabase} from './clientDb';

import('bootstrap/dist/js/bootstrap.bundle.min.js');

interface OfflineRequest {
  url: string;
  method: string;
  body: any;
}

const MAX_RETRIES = 3;

async function retryFetch(req: OfflineRequest, retries = MAX_RETRIES): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
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


export async function queueOrSendRequest(url: string, method: string, body: any): Promise<void> {
  const req: OfflineRequest = { url, method, body };


  if (!navigator.onLine) {
    await addRequest(req);

    // Try to register background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      try {
        await reg.sync.register('sync-queued-requests');
      } catch (err) {
        console.warn('Background sync registration failed:', err);
      }
    }

    showBootstrapToast(`Request queued while offline`);
  } else {
    await retryFetch(req);
    showBootstrapToast(`Request sent`);
  }
}


let bootstrapToastClass: any = null;

export async function loadBootstrap() {
  if (!bootstrapToastClass) {
    const bootstrap = await import('bootstrap/dist/js/bootstrap.bundle.min.js');
    bootstrapToastClass = bootstrap.Toast;
  }
}

async function showBootstrapToast(message: string) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('toast-container');
  if (!container) return;

  await loadBootstrap();

  if (!bootstrapToastClass) {
    console.warn('Bootstrap Toast is not available yet.');
    return;
  }

  const toastEl = document.createElement('div');
  toastEl.className = 'toast align-items-center text-bg-dark border-0';
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toastEl);

  const toast = new bootstrapToastClass(toastEl, { delay: 3000 });
  toast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    container.removeChild(toastEl);
  });
}

export async function syncQueuedRequests(): Promise<void> {
  if (!navigator.onLine) return;

  const requests = await getAllRequests();
  for (const req of requests) {
    try {
      await retryFetch(req);
    } catch (err) {
      console.error('Failed to send queued request:', req, err);
    }
  }

  if (requests.length) {
    console.log(`${requests.length} queued request(s) synced`);
  }

  await clearRequests();
}
