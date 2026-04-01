import {requireSession} from '@lib/requireSession';
import {getUserData} from '@lib/api';
import {NextResponse} from 'next/server';
import {withRouteAuth} from '@lib/routeAuth';

export const GET = withRouteAuth(async function GET() {
  try {
    const session = await requireSession();
    const userData = await getUserData(session.user.id);
    if (!userData) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }
    return NextResponse.json(userData);
  } catch (error) {
    throw error;
  }
});
