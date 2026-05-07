import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { notifyCoachRequestReceived } from '@lib/notifications';
import { errorResponse, notFoundResponse, validationErrorResponse } from '@lib/apiResponses';
import { CoachRequestCreateSchema } from '@lib/contracts/coach';

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = CoachRequestCreateSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const body = parsed.data;

  const coach = await prisma.user.findUnique({
    where: { coachCode: body.code },
    select: { id: true, name: true },
  });
  if (!coach) return notFoundResponse('Coach');
  if (coach.id === userId) {
    return errorResponse('You cannot link yourself as your coach', 400);
  }

  const requester = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachId: true },
  });
  if (requester?.coachId) {
    return errorResponse('You are already linked to a coach', 400);
  }

  // Delete any prior rejected request before creating a new one
  await prisma.coachRequest.deleteMany({
    where: { clientId: userId },
  });

  const request = await prisma.coachRequest.create({
    data: { clientId: userId, coachId: coach.id },
    select: {
      id: true,
      status: true,
      coach: { select: { id: true, name: true } },
    },
  });

  const clientName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? 'Someone';
  await notifyCoachRequestReceived(coach.id, clientName)
    .catch(err => console.error('Failed to send coach notification:', err));

  return NextResponse.json({ request }, { status: 201 });
}

export async function DELETE() {
  const session = await requireSession();
  const userId = session.user.id;

  await prisma.coachRequest.deleteMany({
    where: { clientId: userId },
  });

  return NextResponse.json({ success: true });
}
