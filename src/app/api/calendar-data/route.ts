import {requireSession} from '@lib/requireSession';
import {getUserDayMetrics, getUserEvents} from '@lib/api';
import {NextResponse} from 'next/server';
import {withRouteAuth} from '@lib/routeAuth';

export const GET = withRouteAuth(async function GET() {
  try {
    const session = await requireSession();
    const [events, dayMetrics] = await Promise.all([
      getUserEvents(session.user.id),
      getUserDayMetrics(session.user.id),
    ]);
    return NextResponse.json({events, dayMetrics});
  } catch (error) {
    throw error;
  }
});
