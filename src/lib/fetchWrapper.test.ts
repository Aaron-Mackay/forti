import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchJson } from './fetchWrapper';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchJson', () => {
  it('returns parsed JSON on a successful response', async () => {
    const payload = { id: 1, name: 'Squat' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const result = await fetchJson<typeof payload>('/api/exercises');
    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/exercises', undefined);
  });

  it('forwards RequestInit options to fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const options: RequestInit = {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    };

    await fetchJson('/api/data', options);
    expect(mockFetch).toHaveBeenCalledWith('/api/data', options);
  });

  it('throws when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await expect(fetchJson('/api/missing')).rejects.toThrow('Failed to fetch /api/missing');
  });

  it('propagates network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    await expect(fetchJson('/api/timeout')).rejects.toThrow('Network failure');
  });
});
