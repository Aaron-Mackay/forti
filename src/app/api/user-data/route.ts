import {requireSession} from '@lib/requireSession';
import {getUserData} from '@lib/api';
import {NextResponse} from 'next/server';

export async function GET() {
  try {
    const session = await requireSession();
    const userData = await getUserData(session.user.id);
    if (!userData) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }
    return NextResponse.json(userData);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    throw error;
  }
}
