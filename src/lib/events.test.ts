import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlockOverlapConflictError, createEvent, deleteEvent, reconcileEventMutation, updateEvent } from './events';
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
  recurrenceFrequency: null,
  recurrenceEnd: null,
};

describe('createEvent', () => {
  it('posts the event with serialised dates and returns the created event', async () => {
    const serverEvent = {
      ...baseEvent,
      id: 42,
      startDate: '2024-01-01',
      endDate: '2024-03-01',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({event: serverEvent, affectedEvents: []}),
    });

    const result = await createEvent(baseEvent);

    // Verify the request body contains string dates
    const [[, options]] = mockFetch.mock.calls;
    const body = JSON.parse(options.body as string);
    expect(body.startDate).toBe('2024-01-01');
    expect(body.endDate).toBe('2024-03-01');
    expect(options.method).toBe('POST');

    // Verify dates are hydrated back to Date objects
    expect(result.event.id).toBe(42);
    expect(result.event.startDate).toBeInstanceOf(Date);
    expect(result.event.endDate).toBeInstanceOf(Date);
  });

  it('throws when the server returns an error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      text: async () => 'Conflict',
    });

    await expect(createEvent(baseEvent)).rejects.toThrow('Conflict');
  });

  it('throws a typed conflict error when overlap resolution is required', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({
        error: 'Block overlaps existing block events.',
        details: {
          overlapResolution: [
            {
              eventId: 1,
              name: 'Bulk',
              originalRange: {startDate: '2024-01-01', endDate: '2024-01-31'},
              action: 'truncate',
              resultingRanges: [{startDate: '2024-01-01', endDate: '2024-01-09'}],
            },
          ],
        },
      }),
    });

    await expect(createEvent(baseEvent)).rejects.toBeInstanceOf(BlockOverlapConflictError);
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
      json: async () => ({
        event: {
          ...baseEvent,
          id: 42,
          ...updated,
          startDate: '2024-01-01',
          endDate: '2024-03-01',
        },
        affectedEvents: [],
      }),
    });

    const result = await updateEvent(42, updated);

    const [[url, options]] = mockFetch.mock.calls;
    expect(url).toBe('/api/event/42');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body as string)).toEqual(updated);
    expect(result.event.name).toBe('Cut Block');
  });

  it('throws the parsed JSON error when the server returns an error', async () => {
    const errorBody = { error: 'Validation failed' };
    mockFetch.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify(errorBody),
    });

    await expect(updateEvent(42, {})).rejects.toThrow('Validation failed');
  });
});

describe('reconcileEventMutation', () => {
  it('removes deleted events and upserts updated, created, and primary events', () => {
    const existing = [
      {...baseEvent, id: 1, name: 'Delete me'},
      {...baseEvent, id: 2, name: 'Keep me'},
    ];
    const result = reconcileEventMutation(existing, {
      event: {...baseEvent, id: 3, name: 'New block'},
      affectedEvents: [
        {type: 'deleted', id: 1},
        {type: 'updated', event: {...baseEvent, id: 2, name: 'Trimmed'}},
        {type: 'created', event: {...baseEvent, id: 4, name: 'Split tail'}},
      ],
    });

    expect(result.map((event) => [event.id, event.name])).toEqual([
      [2, 'Trimmed'],
      [4, 'Split tail'],
      [3, 'New block'],
    ]);
  });
});
