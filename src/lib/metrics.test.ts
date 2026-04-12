import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMetricClient } from './metrics';
import { MetricPrisma } from '@/types/dataTypes';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

const metric: MetricPrisma = {
  id: 1,
  userId: 'user-1',
  date: new Date('2024-06-15'),
  weight: 80.5,
  steps: 10000,
  sleepMins: 480,
  calories: 2500,
  protein: 180,
  carbs: 300,
  fat: 70,
  customMetrics: null,
};

describe('updateMetricClient', () => {
  it('posts the metric with the date serialised to a string', async () => {
    const responsePayload = { ...metric, id: 1 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => responsePayload,
    });

    const result = await updateMetricClient(metric);

    const [[url, options]] = mockFetch.mock.calls;
    expect(url).toBe('/api/metric');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body as string);
    // date must be serialised as a YYYY-MM-DD string, not a full ISO timestamp
    expect(body.date).toBe('2024-06-15');
    expect(result).toEqual(responsePayload);
  });

  it('throws when the server returns a non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await expect(updateMetricClient(metric)).rejects.toThrow('Failed to update metric');
  });

  it('propagates network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(updateMetricClient(metric)).rejects.toThrow('Network error');
  });
});
