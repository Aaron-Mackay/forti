import type {Event, Prisma} from '@/generated/prisma/client';
import {EventType} from '@/generated/prisma/browser';
import prisma from '@lib/prisma';
import {
  applyBlockOverlapResolution,
  buildBlockOverlapResolution,
  EventMutationResponse,
} from '@lib/blockOverlapResolution';

type BlockOverlapQueryParams = {
  userId: string;
  startDate: Date;
  endDate: Date;
  excludedEventId?: number;
};

type EventMutationOperation = (tx: Prisma.TransactionClient) => Promise<Event>;

export type BlockOverlapConflictPayload = {
  error: 'Block overlaps existing block events.';
  code: 'CONFLICT';
  details: {
    overlapResolution: ReturnType<typeof buildBlockOverlapResolution>;
  };
};

export type EventBlockMutationResult =
  | {type: 'success'; data: EventMutationResponse}
  | {type: 'conflict'; payload: BlockOverlapConflictPayload};

function buildBlockOverlapWhere({userId, startDate, endDate, excludedEventId}: BlockOverlapQueryParams): Prisma.EventWhereInput {
  return {
    userId,
    eventType: EventType.BlockEvent,
    ...(excludedEventId ? {id: {not: excludedEventId}} : {}),
    startDate: {lte: endDate},
    endDate: {gte: startDate},
  };
}

export async function findOverlappingBlockEvents(params: BlockOverlapQueryParams): Promise<Event[]> {
  return prisma.event.findMany({
    where: buildBlockOverlapWhere(params),
    orderBy: {startDate: 'asc'},
  });
}

export function buildBlockOverlapConflictPayload(
  overlappingBlocks: Event[],
  startDate: Date,
  endDate: Date,
): BlockOverlapConflictPayload {
  return {
    error: 'Block overlaps existing block events.',
    code: 'CONFLICT',
    details: {
      overlapResolution: buildBlockOverlapResolution(overlappingBlocks, startDate, endDate),
    },
  };
}

export async function executeEventBlockMutation(params: {
  userId: string;
  startDate: Date;
  endDate: Date;
  resolveBlockOverlaps: boolean;
  excludedEventId?: number;
  operation: EventMutationOperation;
}): Promise<EventBlockMutationResult> {
  const overlapQuery = {
    userId: params.userId,
    startDate: params.startDate,
    endDate: params.endDate,
    excludedEventId: params.excludedEventId,
  } satisfies BlockOverlapQueryParams;

  const overlappingBlocks = await findOverlappingBlockEvents(overlapQuery);

  if (overlappingBlocks.length > 0 && !params.resolveBlockOverlaps) {
    return {
      type: 'conflict',
      payload: buildBlockOverlapConflictPayload(overlappingBlocks, params.startDate, params.endDate),
    };
  }

  const data = await prisma.$transaction(async (tx) => {
    const currentOverlaps = await tx.event.findMany({
      where: buildBlockOverlapWhere(overlapQuery),
      orderBy: {startDate: 'asc'},
    });
    const affectedEvents = await applyBlockOverlapResolution(
      tx,
      currentOverlaps,
      params.startDate,
      params.endDate,
    );
    const event = await params.operation(tx);

    return {event, affectedEvents} satisfies EventMutationResponse;
  });

  return {type: 'success', data};
}
