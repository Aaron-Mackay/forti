/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getQueuedRequests,
  queueOrSendRequest,
  syncQueuedRequests,
} from './offlineSync';

import * as clientDb from './clientDb';

vi.mock('./clientDb', async () => {
  const actual = await vi.importActual<typeof clientDb>('./clientDb');
  return {
    ...actual,
    addRequest: vi.fn(),
    clearRequests: vi.fn(),
    deleteRequest: vi.fn(),
    getAllRequests: vi.fn(),
    openDatabase: vi.fn(),
  };
});

const mockAddRequest = clientDb.addRequest as unknown as ReturnType<typeof vi.fn>;
const mockClearRequests = clientDb.clearRequests as unknown as ReturnType<typeof vi.fn>;
const mockDeleteRequest = clientDb.deleteRequest as unknown as ReturnType<typeof vi.fn>;
const mockGetAllRequests = clientDb.getAllRequests as unknown as ReturnType<typeof vi.fn>;
const mockOpenDatabase = clientDb.openDatabase as unknown as ReturnType<typeof vi.fn>;

describe('offlineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    (globalThis.navigator as any) = {
      onLine: true,
      serviceWorker: {
        ready: Promise.resolve({
          sync: {
            register: vi.fn(),
          },
        }),
      },
    } as any
    (globalThis as any).SyncManager = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getQueuedRequests', () => {
    it('returns the count of queued requests', async () => {
      const count = 5;
      // Create a mock request object
      const request: any = {};
      const store = {
        count: vi.fn(() => request),
      };
      const tx = { objectStore: vi.fn(() => store) };
      const db = { transaction: vi.fn(() => tx) };
      mockOpenDatabase.mockResolvedValue(db);

      const promise = getQueuedRequests();

      // Simulate onsuccess callback after getQueuedRequests sets it
      setTimeout(() => {
        if (typeof request.onsuccess === 'function') {
          request.result = count;
          request.onsuccess();
        }
      }, 0);

      await expect(promise).resolves.toBe(count);
    });

    it('rejects if there is an error', async () => {
      const error = new Error('fail');
      // Create a mock request object
      const request: any = { error };
      const store = {
        count: vi.fn(() => request),
      };
      const tx = { objectStore: vi.fn(() => store) };
      const db = { transaction: vi.fn(() => tx) };
      mockOpenDatabase.mockResolvedValue(db);

      const promise = getQueuedRequests();

      // Simulate onerror callback after getQueuedRequests sets it
      setTimeout(() => {
        if (typeof request.onerror === 'function') {
          request.onerror();
        }
      }, 0);

      await expect(promise).rejects.toThrow(error);
    });
  });

  describe('queueOrSendRequest', () => {
    const url = '/api/test';
    const method = 'POST';
    const body = { weight: 'bar' };

    it('queues request and registers sync when offline', async () => {
      (globalThis.navigator as any).onLine = false;
      const syncRegister = vi.fn();
      (globalThis.navigator as any).serviceWorker = {
        ready: Promise.resolve({
          sync: { register: syncRegister },
        }),
      };

      await queueOrSendRequest(url, method, body);

      expect(mockAddRequest).toHaveBeenCalledWith({ url, method, body });
      expect(syncRegister).toHaveBeenCalledWith('sync-queued-requests');
    });

    it('queues request but handles sync registration failure', async () => {
      (globalThis.navigator as any).onLine = false;
      const syncRegister = vi.fn().mockRejectedValue(new Error('fail'));
      (globalThis.navigator as any).serviceWorker = {
        ready: Promise.resolve({
          sync: { register: syncRegister },
        }),
      };

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await queueOrSendRequest(url, method, body);

      expect(mockAddRequest).toHaveBeenCalled();
      expect(syncRegister).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();

      consoleWarn.mockRestore();
    });

    it('sends request immediately when online', async () => {
      (globalThis.navigator as any).onLine = true;
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

      await queueOrSendRequest(url, method, body);

      expect(globalThis.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }));
    });
  });

  describe('syncQueuedRequests', () => {
    it('does nothing if offline', async () => {
      (globalThis.navigator as any).onLine = false;
      await syncQueuedRequests();
      expect(mockGetAllRequests).not.toHaveBeenCalled();
    });

    it('retries all queued requests and deletes them individually', async () => {
      (globalThis.navigator as any).onLine = true;
      const requests = [
        { id: 1, url: '/api/1', method: 'POST', body: { a: 1 } },
        { id: 2, url: '/api/2', method: 'PUT', body: { b: 2 } },
      ];
      mockGetAllRequests.mockResolvedValue(requests);
      mockDeleteRequest.mockResolvedValue(undefined);
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

      await syncQueuedRequests();

      expect(globalThis.fetch).toHaveBeenCalledTimes(requests.length);
      expect(mockDeleteRequest).toHaveBeenCalledTimes(requests.length);
      expect(mockDeleteRequest).toHaveBeenCalledWith(1);
      expect(mockDeleteRequest).toHaveBeenCalledWith(2);
      expect(mockClearRequests).not.toHaveBeenCalled();
    });

    it('keeps failed requests in queue and emits sync-failed event', async () => {
      (globalThis.navigator as any).onLine = true;
      const requests = [
        { id: 1, url: '/api/1', method: 'POST', body: { a: 1 } },
        { id: 2, url: '/api/2', method: 'POST', body: { b: 2 } },
      ];
      mockGetAllRequests.mockResolvedValue(requests);
      mockDeleteRequest.mockResolvedValue(undefined);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Request 1 fails with a 4xx (no retry), request 2 succeeds
      globalThis.fetch = vi.fn((url: string) => {
        if (url === '/api/1') return Promise.resolve({ ok: false, status: 400 } as Response);
        return Promise.resolve({ ok: true } as Response);
      });

      const syncFailedHandler = vi.fn();
      window.addEventListener('sync-failed', syncFailedHandler);

      await syncQueuedRequests();

      // Only the successful second request should be deleted
      expect(mockDeleteRequest).toHaveBeenCalledTimes(1);
      expect(mockDeleteRequest).toHaveBeenCalledWith(2);
      expect(syncFailedHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener('sync-failed', syncFailedHandler);
      consoleError.mockRestore();
    });

    it('logs error if a request fails', async () => {
      (globalThis.navigator as any).onLine = true;
      const requests = [
        { id: 1, url: '/api/1', method: 'POST', body: { a: 1 } },
      ];
      mockGetAllRequests.mockResolvedValue(requests);
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await syncQueuedRequests();

      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('retryFetch', () => {
    it('retries up to MAX_RETRIES and succeeds', async () => {
      const req = { url: '/api', method: 'POST', body: { reps: 1 } };
      let callCount = 0;
      globalThis.fetch = vi.fn(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve({ ok: true } as Response);
      });

      const { retryFetch } = await import('./offlineSync');
      const result = await retryFetch(req);
      expect(result).toBeDefined();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      const req = { url: '/api', method: 'POST', body: { reps: 1 } };
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

      const { retryFetch } = await import('./offlineSync');
      await expect(retryFetch(req, 2)).rejects.toThrow('Max retries reached');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on 4xx without retrying', async () => {
      const req = { url: '/api', method: 'POST', body: { reps: 1 } };
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 409 } as Response);

      const { retryFetch } = await import('./offlineSync');
      await expect(retryFetch(req)).rejects.toThrow('HTTP 409');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx server errors', async () => {
      const req = { url: '/api', method: 'POST', body: { reps: 1 } };
      let callCount = 0;
      globalThis.fetch = vi.fn(() => {
        callCount++;
        if (callCount < 2) return Promise.resolve({ ok: false, status: 503 } as Response);
        return Promise.resolve({ ok: true } as Response);
      });

      const { retryFetch } = await import('./offlineSync');
      const result = await retryFetch(req);
      expect(result).toBeDefined();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

export {};
