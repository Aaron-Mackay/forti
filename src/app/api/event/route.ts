import {NextRequest, NextResponse} from 'next/server';
import confirmPermission from '@lib/confirmPermission';
import {EventSchema} from '@lib/apiSchemas';
import {errorResponse, validationErrorResponse} from '@lib/apiResponses';
import {authenticationErrorResponse, isAuthenticationError} from '@lib/requireSession';
import prisma from '@lib/prisma';
import {EventMutationResponse} from '@lib/blockOverlapResolution';
import {EventType} from '@/generated/prisma/browser';
import {executeEventBlockMutation} from '@lib/eventBlockMutation';

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
      ...eventData,
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

    const result = await executeEventBlockMutation({
      userId: completeEvent.userId,
      startDate: completeEvent.startDate,
      endDate: completeEvent.endDate,
      resolveBlockOverlaps,
      operation: async (tx) => tx.event.create({data: completeEvent}),
    });

    if (result.type === 'conflict') {
      return NextResponse.json(result.payload, {status: 409});
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (isAuthenticationError(error)) return authenticationErrorResponse();
    console.error(error);
    return errorResponse('Failed to create event', 500);
  }
}
