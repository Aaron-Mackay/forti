import {findOverlappingBlockEvent, saveUserEvent} from "@lib/api";
import {NextRequest, NextResponse} from "next/server";
import confirmPermission from "@lib/confirmPermission";
import {EventSchema} from "@lib/apiSchemas";
import {errorResponse, validationErrorResponse} from "@lib/apiResponses";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = EventSchema.safeParse(json);

    if (!parsed.success) {
      console.error(parsed.error);
      return validationErrorResponse(parsed.error);
    }

    await confirmPermission(parsed.data.userId);

    const completeEvent = {
      description: null,
      customColor: null,
      blockSubtype: null,
      ...parsed.data
    };

    // Only check for overlap if eventType is BlockEvent
    if (completeEvent.eventType === "BlockEvent") {
      const overlap = await findOverlappingBlockEvent(
        completeEvent.userId,
        completeEvent.startDate,
        completeEvent.endDate
      );
      if (overlap) {
        return errorResponse('BlockEvent overlaps with an existing BlockEvent.', 400);
      }
    }

    const uploadedEvent = await saveUserEvent(completeEvent);
    return NextResponse.json(uploadedEvent);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return errorResponse('Failed to create event', 500);
  }
}
