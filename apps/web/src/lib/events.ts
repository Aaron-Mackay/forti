import {EventPrisma} from "@/types/dataTypes";
import {convertDateStringToDate, convertDateToDateString} from "@lib/dateUtils";

export type BlockOverlapRange = {
  startDate: string;
  endDate: string;
};

export type BlockOverlapResolution = {
  eventId: number;
  name: string;
  originalRange: BlockOverlapRange;
  action: 'delete' | 'truncate' | 'split';
  resultingRanges: BlockOverlapRange[];
};

export type EventMutationAffectedEvent =
  | {type: 'deleted'; id: number}
  | {type: 'updated'; event: EventPrisma}
  | {type: 'created'; event: EventPrisma};

export type EventMutationResponse = {
  event: EventPrisma;
  affectedEvents: EventMutationAffectedEvent[];
};

export type EventMutationOptions = {
  resolveBlockOverlaps?: boolean;
};

export class BlockOverlapConflictError extends Error {
  overlapResolution: BlockOverlapResolution[];

  constructor(message: string, overlapResolution: BlockOverlapResolution[]) {
    super(message);
    this.name = 'BlockOverlapConflictError';
    this.overlapResolution = overlapResolution;
  }
}

function hydrateEvent(event: EventPrisma): EventPrisma {
  return {
    ...event,
    startDate: convertDateStringToDate(event.startDate as unknown as string),
    endDate: convertDateStringToDate(event.endDate as unknown as string),
    recurrenceEnd: event.recurrenceEnd
      ? convertDateStringToDate(event.recurrenceEnd as unknown as string)
      : null,
  };
}

function hydrateMutationResponse(response: EventMutationResponse): EventMutationResponse {
  return {
    event: hydrateEvent(response.event),
    affectedEvents: response.affectedEvents.map((affectedEvent) => {
      if (affectedEvent.type === 'deleted') return affectedEvent;
      return {...affectedEvent, event: hydrateEvent(affectedEvent.event)};
    }),
  };
}

export function reconcileEventMutation(
  events: EventPrisma[],
  response: EventMutationResponse,
): EventPrisma[] {
  const deletedIds = new Set(
    response.affectedEvents
      .filter((affectedEvent) => affectedEvent.type === 'deleted')
      .map((affectedEvent) => affectedEvent.id)
  );
  const nextById = new Map<number, EventPrisma>();

  for (const event of events) {
    if (!deletedIds.has(event.id)) nextById.set(event.id, event);
  }

  for (const affectedEvent of response.affectedEvents) {
    if (affectedEvent.type !== 'deleted') {
      nextById.set(affectedEvent.event.id, affectedEvent.event);
    }
  }

  nextById.set(response.event.id, response.event);
  return Array.from(nextById.values());
}

async function parseEventMutationError(res: Response): Promise<Error> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    const overlapResolution = parsed?.details?.overlapResolution;
    if (res.status === 409 && Array.isArray(overlapResolution)) {
      return new BlockOverlapConflictError(parsed.error ?? 'Block overlaps existing block events.', overlapResolution);
    }
    return new Error(parsed.error ?? text);
  } catch {
    return new Error(text);
  }
}

export async function createEvent(
  event: Omit<EventPrisma, 'id'>,
  options: EventMutationOptions = {},
): Promise<EventMutationResponse> {
  const res = await fetch("/api/event", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      ...event,
      startDate: convertDateToDateString(event.startDate),
      endDate: convertDateToDateString(event.endDate),
      ...options,
    }),
  });
  if (!res.ok) throw await parseEventMutationError(res);
  return hydrateMutationResponse(await res.json());
}

export async function deleteEvent(eventId: number) {
  const res = await fetch(`/api/event/${eventId}`, {
    method: "DELETE",
    headers: {"Content-Type": "application/json"},
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateEvent(
  eventId: number,
  data: Partial<EventPrisma>,
  options: EventMutationOptions = {},
): Promise<EventMutationResponse> {
  const res = await fetch(`/api/event/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...data, ...options}),
  });
  if (!res.ok) throw await parseEventMutationError(res);
  return hydrateMutationResponse(await res.json());
}
