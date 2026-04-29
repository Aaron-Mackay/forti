import { NextRequest, NextResponse } from "next/server";
import {updateUserEvent} from "@/lib/eventService";
import {requireSession} from "@lib/requireSession";
import prisma from "@/lib/prisma";
import {isPrismaNotFound} from "@lib/apiError";
import {z} from "zod";
import {BlockSubtype, EventType} from "@/generated/prisma/browser";
import {errorResponse} from '@lib/apiResponses';
import confirmPermission from '@lib/confirmPermission';
import {EventMutationResponse} from '@lib/blockOverlapResolution';
import {executeEventBlockMutation} from '@lib/eventBlockMutation';

const EventPatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  customColor: z.string().optional().nullable(),
  eventType: z.enum(EventType).optional(),
  blockSubtype: z.enum(BlockSubtype).optional().nullable(),
  recurrenceFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
  recurrenceEnd: z.coerce.date().optional().nullable(),
  resolveBlockOverlaps: z.boolean().optional(),
}).strict();

export async function DELETE(_req: NextRequest, props: {params: Promise<{id: string}>}) {
  const eventId = Number((await props.params).id);
  await requireSession();

  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({error: 'Invalid event ID'}, {status: 400});
  }

  try {
    const event = await prisma.event.findUnique({where: {id: eventId}});
    if (!event) {
      return NextResponse.json({error: 'Event not found'}, {status: 404});
    }
    await confirmPermission(event.userId);
    const deletedEvent = await prisma.event.delete({where: {id: eventId}});
    return NextResponse.json(deletedEvent);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (isPrismaNotFound(error)) {
      return NextResponse.json({error: 'Event not found'}, {status: 404});
    }
    console.error(error);
    return NextResponse.json({error: 'Failed to delete event'}, {status: 500});
  }
}

export async function PATCH(req: NextRequest, props: {params: Promise<{id: string}>}) {
  const eventId = Number((await props.params).id);
  await requireSession();

  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({error: 'Invalid event ID'}, {status: 400});
  }

  try {
    const event = await prisma.event.findUnique({where: {id: eventId}});
    if (!event) {
      return NextResponse.json({error: 'Event not found'}, {status: 404});
    }
    await confirmPermission(event.userId);

    const json = await req.json();
    const parsed = EventPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {error: 'Invalid request', issues: parsed.error.flatten()},
        {status: 400},
      );
    }

    const {resolveBlockOverlaps = false, ...patchData} = parsed.data;
    const nextEvent = {...event, ...patchData};

    if (
      nextEvent.eventType === EventType.BlockEvent &&
      (nextEvent.recurrenceFrequency || nextEvent.recurrenceEnd)
    ) {
      return errorResponse('Block events cannot be recurring.', 400);
    }

    if (nextEvent.eventType !== EventType.BlockEvent) {
      const updatedEvent = await updateUserEvent(eventId, patchData);
      return NextResponse.json({event: updatedEvent, affectedEvents: []} satisfies EventMutationResponse);
    }

    const result = await executeEventBlockMutation({
      userId: nextEvent.userId,
      startDate: nextEvent.startDate,
      endDate: nextEvent.endDate,
      resolveBlockOverlaps,
      excludedEventId: eventId,
      operation: async (tx) => tx.event.update({where: {id: eventId}, data: patchData}),
    });

    if (result.type === 'conflict') {
      return NextResponse.json(result.payload, {status: 409});
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (isPrismaNotFound(error)) {
      return NextResponse.json({error: 'Event not found'}, {status: 404});
    }
    console.error(error);
    return NextResponse.json({error: 'Failed to update event'}, {status: 500});
  }
}
