import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent, deleteEvent, updateEvent } from './events';
import { EventPrisma } from '@/types/dataTypes';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

// Minimal EventPrisma shape used throughout
const baseEvent: Omit<EventPrisma, 'id'> = {
  userId: 'user-1',
  name: 'Bulk Block',
  description: null,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-01'),
  customColor: null,
  eventType: 'BlockEvent',
  blockSubtype: 'Bulk',
};

describe('createEvent', () => {
  it('posts the event with serialised dates and returns the created event', async () => {
    const serverResponse = {
      ...baseEvent,
      id: 42,
      startDate: '2024-01-01',
      endDate: '2024-03-01',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => serverResponse,
    });

    const result = await createEvent(baseEvent);

    // Verify the request body contains string dates
    const [[, options]] = mockFetch.mock.calls;
    const body = JSON.parse(options.body as string);
    expect(body.startDate).toBe('2024-01-01');
    expect(body.endDate).toBe('2024-03-01');
    expect(options.method).toBe('POST');

    // Verify dates are hydrated back to Date objects
    expect(result.id).toBe(42);
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it('throws when the server returns an error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      text: async () => 'Conflict',
    });

    await expect(createEvent(baseEvent)).rejects.toThrow('Conflict');
  });
});

describe('deleteEvent', () => {
  it('sends a DELETE request to the correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: true }),
    });

    const result = await deleteEvent(42);

    const [[url, options]] = mockFetch.mock.calls;
    expect(url).toBe('/api/event/42');
    expect(options.method).toBe('DELETE');
    expect(result).toEqual({ deleted: true });
  });

  it('throws when the server returns an error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      text: async () => 'Not found',
    });

    await expect(deleteEvent(999)).rejects.toThrow('Not found');
  });
});

describe('updateEvent', () => {
  it('sends a PATCH request with the supplied partial data', async () => {
    const updated = { name: 'Cut Block' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 42, ...updated }),
    });

    const result = await updateEvent(42, updated);

    const [[url, options]] = mockFetch.mock.calls;
    expect(url).toBe('/api/event/42');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body as string)).toEqual(updated);
    expect(result.name).toBe('Cut Block');
  });

  it('throws the parsed JSON error when the server returns an error', async () => {
    const errorBody = { message: 'Validation failed' };
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => errorBody,
    });

    await expect(updateEvent(42, {})).rejects.toMatchObject(errorBody);
  });
});
