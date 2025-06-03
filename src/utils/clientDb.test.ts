import {beforeEach, describe, expect, it, vi} from 'vitest';
import 'fake-indexeddb/auto';
import {addRequest, clearRequests, getAllRequests, openDatabase,} from './clientDb';

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

  it('adds a request and dispatches queue-updated event', async () => {
    const handler = vi.fn();
    window.addEventListener('queue-updated', handler);

    await addRequest({url: '/some', method: 'POST', body: {foo: 'bar'}});
    const all = await getAllRequests();

    expect(all.length).toBe(1);
    expect(all[0].url).toBe('/some');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('retrieves all requests', async () => {
    await addRequest({url: '/a', method: 'POST', body: {}});
    await addRequest({url: '/b', method: 'POST', body: {}});

    const all = await getAllRequests();
    expect(all.length).toBe(2);
    expect(all.map(r => r.url)).toEqual(['/a', '/b']);
  });

  it('clears all requests and dispatches event', async () => {
    await addRequest({url: '/to-clear', method: 'POST', body: {}});

    const handler = vi.fn();
    window.addEventListener('queue-updated', handler);

    await clearRequests();

    const all = await getAllRequests();
    expect(all).toHaveLength(0);
    expect(handler).toHaveBeenCalledOnce(); // once in beforeEach
  });
});
