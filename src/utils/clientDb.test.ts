import {beforeEach, describe, expect, it, vi} from 'vitest';
import 'fake-indexeddb/auto';
import {
  addRequest,
  clearRequests,
  deleteRequest,
  getAllRequests,
  getMetricsCache,
  getEventsCache,
  getUserDataCache,
  openDatabase,
  saveMetricsCache,
  saveEventsCache,
  saveUserDataCache,
} from './clientDb';

const mockPayload: Record<string, unknown> = {
  weight: 100
}

describe('clientDb (Vitest)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearRequests();
  });

  it('opens the database and creates the object store', async () => {
    const db = await openDatabase();
    expect(db.name).toBe('OfflineRequestsDB');
    expect(db.objectStoreNames.contains('requests')).toBe(true);
  });

  it('creates cache object stores on upgrade', async () => {
    const db = await openDatabase();
    expect(db.objectStoreNames.contains('userDataCache')).toBe(true);
    expect(db.objectStoreNames.contains('eventsCache')).toBe(true);
    expect(db.objectStoreNames.contains('metricsCache')).toBe(true);
  });

  it('adds a request and dispatches queue-updated event', async () => {
    const handler = vi.fn();
    window.addEventListener('queue-updated', handler);

    await addRequest({url: '/some', method: 'POST', body: mockPayload});
    const all = await getAllRequests();

    expect(all.length).toBe(1);
    expect(all[0].url).toBe('/some');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('retrieves all requests', async () => {
    await addRequest({url: '/a', method: 'POST', body: mockPayload});
    await addRequest({url: '/b', method: 'POST', body: mockPayload});

    const all = await getAllRequests();
    expect(all.length).toBe(2);
    expect(all.map(r => r.url)).toEqual(['/a', '/b']);
  });

  it('clears all requests and dispatches event', async () => {
    await addRequest({url: '/to-clear', method: 'POST', body: mockPayload});

    const handler = vi.fn();
    window.addEventListener('queue-updated', handler);

    await clearRequests();

    const all = await getAllRequests();
    expect(all).toHaveLength(0);
    expect(handler).toHaveBeenCalledOnce(); // once in beforeEach
  });

  it('deletes a single request by id and dispatches queue-updated', async () => {
    await addRequest({url: '/a', method: 'POST', body: mockPayload});
    await addRequest({url: '/b', method: 'POST', body: mockPayload});

    const all = await getAllRequests();
    expect(all).toHaveLength(2);
    const idToDelete = all[0].id as number;

    const handler = vi.fn();
    window.addEventListener('queue-updated', handler);

    await deleteRequest(idToDelete);

    const remaining = await getAllRequests();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].url).toBe('/b');
    expect(handler).toHaveBeenCalled();
  });
});

describe('clientDb cache helpers', () => {
  const userId = 'user-123';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeUserData = {id: userId, name: 'Alice', plans: []} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeEvents = [{id: 1, name: 'Bulk', userId}] as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeMetrics = [{id: 1, userId, date: new Date(), weight: 80}] as any[];

  it('saves and retrieves userDataCache', async () => {
    await saveUserDataCache(userId, fakeUserData);
    const entry = await getUserDataCache(userId);
    expect(entry).toBeDefined();
    expect(entry!.userId).toBe(userId);
    expect(entry!.data).toEqual(fakeUserData);
    expect(entry!.savedAt).toBeGreaterThan(0);
  });

  it('overwrites existing userDataCache entry', async () => {
    await saveUserDataCache(userId, fakeUserData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = {...fakeUserData, name: 'Updated'} as any;
    await saveUserDataCache(userId, updated);
    const entry = await getUserDataCache(userId);
    expect(entry!.data.name).toBe('Updated');
  });

  it('returns undefined for missing userDataCache entry', async () => {
    const entry = await getUserDataCache('nonexistent');
    expect(entry).toBeUndefined();
  });

  it('saves and retrieves eventsCache', async () => {
    await saveEventsCache(userId, fakeEvents);
    const entry = await getEventsCache(userId);
    expect(entry).toBeDefined();
    expect(entry!.data).toEqual(fakeEvents);
  });

  it('saves and retrieves metricsCache', async () => {
    await saveMetricsCache(userId, fakeMetrics);
    const entry = await getMetricsCache(userId);
    expect(entry).toBeDefined();
    expect(entry!.data).toEqual(fakeMetrics);
  });

  it('returns undefined for missing eventsCache entry', async () => {
    const entry = await getEventsCache('nonexistent');
    expect(entry).toBeUndefined();
  });

  it('returns undefined for missing metricsCache entry', async () => {
    const entry = await getMetricsCache('nonexistent');
    expect(entry).toBeUndefined();
  });

  it('savedAt is set to a recent timestamp', async () => {
    const before = Date.now();
    await saveEventsCache(userId, fakeEvents);
    const after = Date.now();
    const entry = await getEventsCache(userId);
    expect(entry!.savedAt).toBeGreaterThanOrEqual(before);
    expect(entry!.savedAt).toBeLessThanOrEqual(after);
  });
});
