import {NextRequest, NextResponse} from "next/server";
import confirmPermission from "@lib/confirmPermission";
import {EventSchema} from "@lib/apiSchemas";
import {errorResponse, validationErrorResponse} from "@lib/apiResponses";
import {authenticationErrorResponse, isAuthenticationError} from "@lib/requireSession";
import prisma from "@lib/prisma";
import {
  applyBlockOverlapResolution,
  buildBlockOverlapResolution,
  EventMutationResponse,
} from "@lib/blockOverlapResolution";
import {EventType} from "@/generated/prisma/browser";

function blockOverlapConflictResponse(overlapResolution: ReturnType<typeof buildBlockOverlapResolution>) {
  return NextResponse.json(
    {
      error: 'Block overlaps existing block events.',
      code: 'CONFLICT',
      details: {overlapResolution},
    },
    {status: 409},
  );
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = EventSchema.safeParse(json);

    if (!parsed.success) {
      console.error(parsed.error);
      return validationErrorResponse(parsed.error);
    }

    await confirmPermission(parsed.data.userId);

    const {resolveBlockOverlaps = false, ...eventData} = parsed.data;
    const completeEvent = {
      description: null,
      customColor: null,
      blockSubtype: null,
      recurrenceFrequency: null,
      recurrenceEnd: null,
      ...eventData
    };

    if (
      completeEvent.eventType === EventType.BlockEvent &&
      (completeEvent.recurrenceFrequency || completeEvent.recurrenceEnd)
    ) {
      return errorResponse('Block events cannot be recurring.', 400);
    }

    if (completeEvent.eventType !== EventType.BlockEvent) {
      const uploadedEvent = await prisma.event.create({data: completeEvent});
      return NextResponse.json({event: uploadedEvent, affectedEvents: []} satisfies EventMutationResponse);
    }

    const overlappingBlocks = await prisma.event.findMany({
      where: {
        userId: completeEvent.userId,
        eventType: EventType.BlockEvent,
        startDate: {lte: completeEvent.endDate},
        endDate: {gte: completeEvent.startDate},
      },
      orderBy: {startDate: 'asc'},
    });

    if (overlappingBlocks.length > 0 && !resolveBlockOverlaps) {
      return blockOverlapConflictResponse(
        buildBlockOverlapResolution(overlappingBlocks, completeEvent.startDate, completeEvent.endDate)
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentOverlaps = await tx.event.findMany({
        where: {
          userId: completeEvent.userId,
          eventType: EventType.BlockEvent,
          startDate: {lte: completeEvent.endDate},
          endDate: {gte: completeEvent.startDate},
        },
        orderBy: {startDate: 'asc'},
      });
      const affectedEvents = await applyBlockOverlapResolution(
        tx,
        currentOverlaps,
        completeEvent.startDate,
        completeEvent.endDate
      );
      const event = await tx.event.create({data: completeEvent});
      return {event, affectedEvents} satisfies EventMutationResponse;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (isAuthenticationError(error)) return authenticationErrorResponse();
    console.error(error);
    return errorResponse('Failed to create event', 500);
  }
}
