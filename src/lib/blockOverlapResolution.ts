import type {Event} from '@/generated/prisma/client';
import {convertDateToDateString} from '@lib/dateUtils';

export type BlockOverlapResolutionAction = 'delete' | 'truncate' | 'split';

export type BlockOverlapRange = {
  startDate: string;
  endDate: string;
};

export type BlockOverlapResolution = {
  eventId: number;
  name: string;
  originalRange: BlockOverlapRange;
  action: BlockOverlapResolutionAction;
  resultingRanges: BlockOverlapRange[];
};

export type EventMutationAffectedEvent =
  | {type: 'deleted'; id: number}
  | {type: 'updated'; event: Event}
  | {type: 'created'; event: Event};

export type EventMutationResponse = {
  event: Event;
  affectedEvents: EventMutationAffectedEvent[];
};

type EventTx = {
  event: {
    delete: (args: {where: {id: number}}) => Promise<Event>;
    update: (args: {where: {id: number}; data: Partial<Event>}) => Promise<Event>;
    create: (args: {data: Omit<Event, 'id'>}) => Promise<Event>;
  };
};

function toRange(startDate: Date, endDate: Date): BlockOverlapRange {
  return {
    startDate: convertDateToDateString(startDate),
    endDate: convertDateToDateString(endDate),
  };
}

export function buildBlockOverlapResolution(
  overlappingBlocks: Event[],
  incomingStartDate: Date,
  incomingEndDate: Date,
): BlockOverlapResolution[] {
  return overlappingBlocks.map((block) => {
    const originalRange = toRange(block.startDate, block.endDate);

    if (block.startDate >= incomingStartDate && block.endDate <= incomingEndDate) {
      return {
        eventId: block.id,
        name: block.name,
        originalRange,
        action: 'delete',
        resultingRanges: [],
      };
    }

    if (block.startDate < incomingStartDate && block.endDate > incomingEndDate) {
      return {
        eventId: block.id,
        name: block.name,
        originalRange,
        action: 'split',
        resultingRanges: [
          toRange(block.startDate, incomingStartDate),
          toRange(incomingEndDate, block.endDate),
        ],
      };
    }

    if (block.startDate < incomingStartDate) {
      return {
        eventId: block.id,
        name: block.name,
        originalRange,
        action: 'truncate',
        resultingRanges: [toRange(block.startDate, incomingStartDate)],
      };
    }

    return {
      eventId: block.id,
      name: block.name,
      originalRange,
      action: 'truncate',
      resultingRanges: [toRange(incomingEndDate, block.endDate)],
    };
  });
}

export async function applyBlockOverlapResolution(
  tx: EventTx,
  overlappingBlocks: Event[],
  incomingStartDate: Date,
  incomingEndDate: Date,
): Promise<EventMutationAffectedEvent[]> {
  const affectedEvents: EventMutationAffectedEvent[] = [];

  for (const block of overlappingBlocks) {
    if (block.startDate >= incomingStartDate && block.endDate <= incomingEndDate) {
      await tx.event.delete({where: {id: block.id}});
      affectedEvents.push({type: 'deleted', id: block.id});
      continue;
    }

    if (block.startDate < incomingStartDate && block.endDate > incomingEndDate) {
      const updated = await tx.event.update({
        where: {id: block.id},
        data: {endDate: incomingStartDate},
      });
      const created = await tx.event.create({
        data: {
          userId: block.userId,
          name: block.name,
          description: block.description,
          startDate: incomingEndDate,
          endDate: block.endDate,
          customColor: block.customColor,
          eventType: block.eventType,
          blockSubtype: block.blockSubtype,
          recurrenceFrequency: null,
          recurrenceEnd: null,
        },
      });
      affectedEvents.push({type: 'updated', event: updated}, {type: 'created', event: created});
      continue;
    }

    const data = block.startDate < incomingStartDate
      ? {endDate: incomingStartDate}
      : {startDate: incomingEndDate};
    const updated = await tx.event.update({where: {id: block.id}, data});
    affectedEvents.push({type: 'updated', event: updated});
  }

  return affectedEvents;
}
