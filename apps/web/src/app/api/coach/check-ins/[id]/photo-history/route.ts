import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { getCoachClientPhotoHistory } from '@lib/coachCheckIns';
import { errorResponse, forbiddenResponse, notFoundResponse } from '@lib/apiResponses';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const checkInId = Number(id);

  if (Number.isNaN(checkInId)) return errorResponse('Invalid id', 400);

  const result = await getCoachClientPhotoHistory(session.user.id, checkInId);
  if (result.status === 'forbidden') return forbiddenResponse('Coach mode is not active');
  if (result.status === 'not_found') return notFoundResponse('Check-in');

  return NextResponse.json({ entries: result.entries });
}
