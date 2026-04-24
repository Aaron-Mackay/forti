import {describe, expect, it, vi} from 'vitest';
import {EventType, BlockSubtype} from '@/generated/prisma/browser';
import type {Event} from '@/generated/prisma/client';
import {
  applyBlockOverlapResolution,
  buildBlockOverlapResolution,
} from './blockOverlapResolution';

function date(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function block(overrides: Partial<Event>): Event {
  return {
    id: 1,
    userId: 'user-1',
    name: 'Bulk',
    description: null,
    startDate: date('2024-01-01'),
    endDate: date('2024-01-31'),
    customColor: null,
    eventType: EventType.BlockEvent,
    blockSubtype: BlockSubtype.Bulk,
    recurrenceFrequency: null,
    recurrenceEnd: null,
    ...overrides,
  };
}

describe('buildBlockOverlapResolution', () => {
  it('marks fully covered blocks for deletion', () => {
    const result = buildBlockOverlapResolution(
      [block({startDate: date('2024-01-10'), endDate: date('2024-01-20')})],
      date('2024-01-01'),
      date('2024-01-31'),
    );

    expect(result).toEqual([
      {
        eventId: 1,
        name: 'Bulk',
        originalRange: {startDate: '2024-01-10', endDate: '2024-01-20'},
        action: 'delete',
        resultingRanges: [],
      },
    ]);
  });

  it('truncates an overlap at the end of an existing block', () => {
    const result = buildBlockOverlapResolution(
      [block({startDate: date('2024-01-01'), endDate: date('2024-01-20')})],
      date('2024-01-10'),
      date('2024-01-31'),
    );

    expect(result[0]).toMatchObject({
      action: 'truncate',
      resultingRanges: [{startDate: '2024-01-01', endDate: '2024-01-09'}],
    });
  });

  it('truncates an overlap at the start of an existing block', () => {
    const result = buildBlockOverlapResolution(
      [block({startDate: date('2024-01-10'), endDate: date('2024-01-31')})],
      date('2024-01-01'),
      date('2024-01-20'),
    );

    expect(result[0]).toMatchObject({
      action: 'truncate',
      resultingRanges: [{startDate: '2024-01-21', endDate: '2024-01-31'}],
    });
  });

  it('splits an existing block when the incoming block sits inside it', () => {
    const result = buildBlockOverlapResolution(
      [block({startDate: date('2024-01-01'), endDate: date('2024-01-31')})],
      date('2024-01-10'),
      date('2024-01-20'),
    );

    expect(result[0]).toMatchObject({
      action: 'split',
      resultingRanges: [
        {startDate: '2024-01-01', endDate: '2024-01-09'},
        {startDate: '2024-01-21', endDate: '2024-01-31'},
      ],
    });
  });
});

describe('applyBlockOverlapResolution', () => {
  it('updates the original block and creates the after block for splits', async () => {
    const original = block({startDate: date('2024-01-01'), endDate: date('2024-01-31')});
    const updated = {...original, endDate: date('2024-01-09')};
    const created = {...original, id: 2, startDate: date('2024-01-21')};
    const tx = {
      event: {
        delete: vi.fn(),
        update: vi.fn().mockResolvedValue(updated),
        create: vi.fn().mockResolvedValue(created),
      },
    };

    const affected = await applyBlockOverlapResolution(tx, [original], date('2024-01-10'), date('2024-01-20'));

    expect(tx.event.update).toHaveBeenCalledWith({
      where: {id: 1},
      data: {endDate: date('2024-01-09')},
    });
    expect(tx.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        name: 'Bulk',
        startDate: date('2024-01-21'),
        endDate: date('2024-01-31'),
        recurrenceFrequency: null,
        recurrenceEnd: null,
      }),
    });
    expect(affected).toEqual([
      {type: 'updated', event: updated},
      {type: 'created', event: created},
    ]);
  });
});
