import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchJson, postJson, putJson, patchJson, deleteJson } from './fetchWrapper';

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

describe('postJson', () => {
  it('sends a POST with JSON body and Content-Type header', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await postJson('/api/plan', { name: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
  });
});

describe('putJson', () => {
  it('sends a PUT with JSON body and Content-Type header', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await putJson('/api/plan/1', { name: 'Updated' });
    expect(mockFetch).toHaveBeenCalledWith('/api/plan/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
  });
});

describe('patchJson', () => {
  it('sends a PATCH with JSON body and Content-Type header', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await patchJson('/api/sets/5', { reps: 10 });
    expect(mockFetch).toHaveBeenCalledWith('/api/sets/5', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reps: 10 }),
    });
  });
});

describe('deleteJson', () => {
  it('sends a DELETE request with no body', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await deleteJson('/api/sets/5');
    expect(mockFetch).toHaveBeenCalledWith('/api/sets/5', { method: 'DELETE' });
  });
});
