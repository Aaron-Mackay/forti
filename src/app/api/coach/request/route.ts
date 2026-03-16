import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const body = await req.json() as { code: string };
  if (!body.code || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ error: 'code must be a 6-digit number' }, { status: 400 });
  }

  // Find the coach by their code
  const coach = await prisma.user.findUnique({
    where: { coachCode: body.code },
    select: { id: true, name: true },
  });
  if (!coach) {
    return NextResponse.json({ error: 'No coach found with that code' }, { status: 404 });
  }
  if (coach.id === userId) {
    return NextResponse.json({ error: 'You cannot link yourself as your coach' }, { status: 400 });
  }

  const requester = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachId: true },
  });
  if (requester?.coachId) {
    return NextResponse.json({ error: 'You are already linked to a coach' }, { status: 400 });
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
