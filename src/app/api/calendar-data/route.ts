import {requireSession} from '@lib/requireSession';
import {getUserMetrics, getUserEvents} from '@lib/api';
import {NextResponse} from 'next/server';
import {withRouteAuth} from '@lib/routeAuth';

export const GET = withRouteAuth(async function GET() {
  try {
    const session = await requireSession();
    const [events, metrics] = await Promise.all([
      getUserEvents(session.user.id),
      getUserMetrics(session.user.id),
    ]);
    return NextResponse.json({events, metrics});
  } catch (error) {
    throw error;
  }
});
