import type {MetricPrisma, EventPrisma, UserPrisma} from '@/types/dataTypes';

interface OfflineRequest {
  id?: number;
  url: string;
  method: string;
  body: Record<string, unknown>;
}

export interface CacheEntry<T> {
  userId: string;
  data: T;
  savedAt: number; // Date.now()
}

const DB_NAME = 'OfflineRequestsDB';
const DB_VERSION = 3;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
      if (!db.objectStoreNames.contains('metricsCache')) {
        db.createObjectStore('metricsCache', {keyPath: 'userId'});
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addRequest(data: Omit<OfflineRequest, 'id'>): Promise<number> {
  const db = await openDatabase();
  const tx = db.transaction('requests', 'readwrite');
  const store = tx.objectStore('requests');
  return new Promise<number>((resolve, reject) => {
    const request = store.add(data);
    request.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('queue-updated')); // ✅ dispatch event on add
      resolve(Number(request.result));
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

export async function deleteRequest(id: number): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('requests', 'readwrite');
  const store = tx.objectStore('requests');
  const req = store.delete(id);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('queue-updated'));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearRequests(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('requests', 'readwrite');
  const store = tx.objectStore('requests');
  const clearReq = store.clear();
  clearReq.onsuccess = () => {
    window.dispatchEvent(new CustomEvent('queue-updated')); // ✅ dispatch on sync
  };
}

// ── Generic cache helpers ─────────────────────────────────────────────────────

async function saveToCache<T>(storeName: string, entry: CacheEntry<T>): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function readFromCache<T>(storeName: string, userId: string): Promise<CacheEntry<T> | undefined> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result as CacheEntry<T> | undefined);
    req.onerror = () => reject(req.error);
  });
}

// ── Typed cache exports ───────────────────────────────────────────────────────

export async function saveUserDataCache(userId: string, data: UserPrisma): Promise<void> {
  return saveToCache('userDataCache', {userId, data, savedAt: Date.now()});
}

export async function getUserDataCache(userId: string): Promise<CacheEntry<UserPrisma> | undefined> {
  return readFromCache<UserPrisma>('userDataCache', userId);
}

export async function saveEventsCache(userId: string, data: EventPrisma[]): Promise<void> {
  return saveToCache('eventsCache', {userId, data, savedAt: Date.now()});
}

export async function getEventsCache(userId: string): Promise<CacheEntry<EventPrisma[]> | undefined> {
  return readFromCache<EventPrisma[]>(userId, userId);
}

export async function saveMetricsCache(userId: string, data: MetricPrisma[]): Promise<void> {
  return saveToCache('metricsCache', {userId, data, savedAt: Date.now()});
}

export async function getMetricsCache(userId: string): Promise<CacheEntry<MetricPrisma[]> | undefined> {
  return readFromCache<MetricPrisma[]>('metricsCache', userId);
}
