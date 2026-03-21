import {NextRequest, NextResponse} from "next/server";
import {requireSession} from "@lib/requireSession";
import prisma from "@lib/prisma";
import {buildIcalString} from "@/app/api/event/icalBuilder";
import {errorResponse, notFoundResponse, forbiddenResponse} from "@lib/apiResponses";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const eventId = Number((await props.params).id);

  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({error: 'Invalid event ID'}, {status: 400});
  }

  try {
    const session = await requireSession();
    const event = await prisma.event.findUnique({where: {id: eventId}});

    if (!event) return notFoundResponse('Event not found');
    if (event.userId !== session.user.id) return forbiddenResponse();

    const ical = buildIcalString([event]);
    const safeName = event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="forti-${safeName}.ics"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return errorResponse('Failed to export event', 500);
  }
}
