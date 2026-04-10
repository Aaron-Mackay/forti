import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { notifyClientCoachFeedback } from '@lib/notifications';
import { getCoachCheckInById } from '@lib/coachCheckIns';

/** PATCH /api/coach/check-ins/[id]/notes — coach saves notes on a client's check-in */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const coachId = session.user.id;
  const { id } = await params;
  const checkInId = parseInt(id);

  if (isNaN(checkInId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const checkInResult = await getCoachCheckInById(coachId, checkInId);
  if (checkInResult.status === 'forbidden') {
    return NextResponse.json({ error: 'Coach mode is not active' }, { status: 403 });
  }
  if (checkInResult.status === 'not_found') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { checkIn } = checkInResult;

  const body = await req.json() as { coachNotes: string; coachResponseUrl?: string | null };
  if (typeof body.coachNotes !== 'string') {
    return NextResponse.json({ error: 'coachNotes must be a string' }, { status: 400 });
  }
  if (
    body.coachResponseUrl !== undefined
    && body.coachResponseUrl !== null
    && typeof body.coachResponseUrl !== 'string'
  ) {
    return NextResponse.json({ error: 'coachResponseUrl must be a string' }, { status: 400 });
  }

  const trimmedCoachResponseUrl = body.coachResponseUrl?.trim() ?? '';
  if (trimmedCoachResponseUrl) {
    try {
      const parsed = new URL(trimmedCoachResponseUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ error: 'coachResponseUrl must be a valid http(s) URL' }, { status: 400 });
    }
  }

  const updated = await prisma.weeklyCheckIn.update({
    where: { id: checkInId },
    data: {
      coachNotes: body.coachNotes,
      coachResponseUrl: trimmedCoachResponseUrl || null,
      coachReviewedAt: new Date(),
    },
  });

  const coachName = (await prisma.user.findUnique({ where: { id: coachId }, select: { name: true } }))?.name ?? 'Your coach';
  await notifyClientCoachFeedback(checkIn.userId, coachName)
    .catch(err => console.error('Failed to send client notification:', err));

  return NextResponse.json({ checkIn: updated });
}
