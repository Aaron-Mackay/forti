import {requireSession} from '@lib/requireSession';
import {getUserEvents} from '@lib/eventService';
import {getUserMetrics} from '@lib/metricService';
import {NextResponse} from 'next/server';
import {withRouteAuth} from '@lib/routeAuth';
import {CalendarDataResponseSchema, type CalendarDataResponse} from '@lib/contracts/calendarData';

export const GET = withRouteAuth(async function GET() {
  const session = await requireSession();
  const [events, metrics] = await Promise.all([
    getUserEvents(session.user.id),
    getUserMetrics(session.user.id),
  ]);
  const payload: CalendarDataResponse = CalendarDataResponseSchema.parse({events, metrics});
  return NextResponse.json(payload);
});
