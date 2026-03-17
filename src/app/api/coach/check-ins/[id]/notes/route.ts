import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';

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

  // Verify coach mode
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { settings: true, clients: { select: { id: true } } },
  });
  const settings = parseDashboardSettings(coach?.settings);
  if (!settings.coachModeActive) {
    return NextResponse.json({ error: 'Coach mode is not active' }, { status: 403 });
  }

  const clientIds = (coach?.clients ?? []).map(c => c.id);

  // Ensure the check-in belongs to one of this coach's clients
  const checkIn = await prisma.weeklyCheckIn.findUnique({ where: { id: checkInId } });
  if (!checkIn || !clientIds.includes(checkIn.userId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as { coachNotes: string };
  if (typeof body.coachNotes !== 'string') {
    return NextResponse.json({ error: 'coachNotes must be a string' }, { status: 400 });
  }

  const updated = await prisma.weeklyCheckIn.update({
    where: { id: checkInId },
    data: { coachNotes: body.coachNotes, coachReviewedAt: new Date() },
  });

  return NextResponse.json({ checkIn: updated });
}
