import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import {withRouteAuth} from '@lib/routeAuth';
import {CalendarDataResponseSchema, type CalendarDataResponse} from '@lib/contracts/calendarData';
import { getUserEvents } from '@lib/eventService';
import { getUserMetrics } from '@lib/metricService';
import { forbiddenResponse } from '@lib/apiResponses';
import { getCoachClientCalendarData } from '@lib/coachCalendar';

export const GET = withRouteAuth(async function GET(request: NextRequest) {
  const session = await requireSession();
  const clientId = request.nextUrl.searchParams.get('clientId');

  if (clientId) {
    const coachData = await getCoachClientCalendarData(session.user.id, clientId);
    if (!coachData) return forbiddenResponse();
    const payload: CalendarDataResponse = CalendarDataResponseSchema.parse(coachData);
    return NextResponse.json(payload);
  }

  const [events, metrics] = await Promise.all([getUserEvents(session.user.id), getUserMetrics(session.user.id)]);
  const payload: CalendarDataResponse = CalendarDataResponseSchema.parse({events, metrics});
  return NextResponse.json(payload);
});
