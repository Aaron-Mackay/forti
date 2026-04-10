import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { getCoachCheckInById } from '@lib/coachCheckIns';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const checkInId = Number(id);

  if (Number.isNaN(checkInId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const result = await getCoachCheckInById(session.user.id, checkInId);
  if (result.status === 'forbidden') {
    return NextResponse.json({ error: 'Coach mode is not active' }, { status: 403 });
  }
  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ checkIn: result.checkIn });
}
