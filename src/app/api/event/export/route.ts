import {NextResponse} from "next/server";
import {requireSession} from "@lib/requireSession";
import {getUserEvents} from "@lib/api";
import {buildIcalString} from "@/app/api/event/icalBuilder";
import {errorResponse} from "@lib/apiResponses";

export async function GET() {
  try {
    const session = await requireSession();
    const events = await getUserEvents(session.user.id);
    const ical = buildIcalString(events);

    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="forti-calendar.ics"',
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return errorResponse('Failed to export calendar', 500);
  }
}
