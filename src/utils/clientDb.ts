import type {DayMetricPrisma, EventPrisma, UserPrisma} from '@/types/dataTypes';

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
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains('dayMetricsCache')) {
        db.createObjectStore('dayMetricsCache', {keyPath: 'userId'});
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
  return readFromCache<EventPrisma[]>('eventsCache', userId);
}

export async function saveDayMetricsCache(userId: string, data: DayMetricPrisma[]): Promise<void> {
  return saveToCache('dayMetricsCache', {userId, data, savedAt: Date.now()});
}

export async function getDayMetricsCache(userId: string): Promise<CacheEntry<DayMetricPrisma[]> | undefined> {
  return readFromCache<DayMetricPrisma[]>('dayMetricsCache', userId);
}
