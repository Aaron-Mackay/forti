import {saveUserEvent} from "@lib/api";
import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {BlockSubtype, EventType} from "@prisma/client";

const EventSchema = z.object({
  userId: z.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  name: z.string(),
  eventType: z.enum(EventType),
  description: z.string().optional().nullable(),
  customColor: z.string().optional().nullable(),
  blockSubtype: z.enum(BlockSubtype).optional().nullable()
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = EventSchema.safeParse(json)

    if (!parsed.success) {
      console.error(parsed.error)
      return NextResponse.json(
        {error: 'Invalid request', issues: parsed.error.flatten()},
        {status: 400}
      );
    }

    const completeEvent = {
      description: null,
      customColor: null,
      blockSubtype: null,
      ...parsed.data
    }

    const uploadedEvent = await saveUserEvent(completeEvent);

    return NextResponse.json(uploadedEvent);
  } catch (error) {
    console.error(error);
    return NextResponse.json({error: 'Failed to create event'}, {status: 500});
  }
}