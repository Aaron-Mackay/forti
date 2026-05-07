import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NextRequest} from 'next/server';
import {BlockSubtype, EventType} from '@/generated/prisma/browser';

const {mockConfirmPermission, mockPrisma, mockTx} = vi.hoisted(() => {
  const tx = {
    event: {
      findMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    mockConfirmPermission: vi.fn(),
    mockTx: tx,
    mockPrisma: {
      event: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock('@lib/confirmPermission', () => ({
  default: mockConfirmPermission,
}));

vi.mock('@lib/prisma', () => ({
  default: mockPrisma,
}));

vi.mock('@lib/requireSession', () => ({
  isAuthenticationError: vi.fn(() => false),
  authenticationErrorResponse: vi.fn(() => Response.json({error: 'Unauthorized'}, {status: 401})),
}));

import {POST} from './route';

function date(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function makeBlock(overrides: Record<string, unknown> = {}) {
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

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/event', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });
}

describe('POST /api/event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmPermission.mockResolvedValue(undefined);
    mockPrisma.event.findMany.mockResolvedValue([]);
    mockPrisma.event.create.mockResolvedValue(makeBlock({id: 10, name: 'Cut'}));
    mockTx.event.findMany.mockResolvedValue([]);
    mockTx.event.delete.mockResolvedValue(makeBlock());
    mockTx.event.update.mockResolvedValue(makeBlock({endDate: date('2024-01-10')}));
    mockTx.event.create.mockResolvedValue(makeBlock({id: 10, name: 'Cut'}));
  });

  it('returns a conflict preview when a new block overlaps an existing block', async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      makeBlock({startDate: date('2024-01-01'), endDate: date('2024-01-31')}),
    ]);

    const res = await POST(makeRequest({
      userId: 'user-1',
      name: 'Cut',
      startDate: '2024-01-10',
      endDate: '2024-01-20',
      eventType: EventType.BlockEvent,
      blockSubtype: BlockSubtype.Cut,
    }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.details.overlapResolution[0]).toMatchObject({
      eventId: 1,
      action: 'split',
      resultingRanges: [
        {startDate: '2024-01-01', endDate: '2024-01-10'},
        {startDate: '2024-01-20', endDate: '2024-01-31'},
      ],
    });
  });

  it('applies overlap resolution inside the transaction when confirmed', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeBlock()]);
    mockTx.event.findMany.mockResolvedValue([makeBlock()]);
    mockTx.event.create
      .mockResolvedValueOnce(makeBlock({id: 2, startDate: date('2024-01-20')}))
      .mockResolvedValueOnce(makeBlock({
        id: 10,
        name: 'Cut',
        startDate: date('2024-01-10'),
        endDate: date('2024-01-20'),
        blockSubtype: BlockSubtype.Cut,
      }));

    const res = await POST(makeRequest({
      userId: 'user-1',
      name: 'Cut',
      startDate: '2024-01-10',
      endDate: '2024-01-20',
      eventType: EventType.BlockEvent,
      blockSubtype: BlockSubtype.Cut,
      resolveBlockOverlaps: true,
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.event.update).toHaveBeenCalledWith({
      where: {id: 1},
      data: {endDate: date('2024-01-10')},
    });
    expect(body.event).toMatchObject({id: 10, name: 'Cut'});
    expect(body.affectedEvents.map((affectedEvent: {type: string}) => affectedEvent.type)).toEqual(['updated', 'created']);
  });

  it('rejects recurring block events', async () => {
    const res = await POST(makeRequest({
      userId: 'user-1',
      name: 'Cut',
      startDate: '2024-01-10',
      endDate: '2024-01-20',
      eventType: EventType.BlockEvent,
      blockSubtype: BlockSubtype.Cut,
      recurrenceFrequency: 'WEEKLY',
    }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Block events cannot be recurring.');
  });

  it('does not treat adjacent block ranges as overlaps', async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const res = await POST(makeRequest({
      userId: 'user-1',
      name: 'Cut',
      startDate: '2024-01-31',
      endDate: '2024-02-10',
      eventType: EventType.BlockEvent,
      blockSubtype: BlockSubtype.Cut,
    }));

    expect(res.status).toBe(200);
    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        startDate: {lt: date('2024-02-10')},
        endDate: {gt: date('2024-01-31')},
      }),
    }));
  });
});
