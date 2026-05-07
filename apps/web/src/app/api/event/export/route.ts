import {NextResponse} from "next/server";
import { requireSession, authenticationErrorResponse, isAuthenticationError } from "@lib/requireSession";
import {getUserEvents} from "@lib/eventService";
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
    if (isAuthenticationError(error)) return authenticationErrorResponse();
    console.error(error);
    return errorResponse('Failed to export calendar', 500);
  }
}
