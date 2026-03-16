import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;

  const { requestId } = await params;
  const id = parseInt(requestId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid requestId' }, { status: 400 });
  }

  const body = await req.json() as { action: 'accept' | 'reject' };
  if (body.action !== 'accept' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 });
  }

  const coachRequest = await prisma.coachRequest.findUnique({
    where: { id },
    select: { id: true, clientId: true, coachId: true, status: true },
  });

  if (!coachRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }
  if (coachRequest.coachId !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (coachRequest.status !== 'Pending') {
    return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });
  }

  if (body.action === 'accept') {
    await prisma.$transaction([
      prisma.coachRequest.delete({ where: { id } }),
      prisma.user.update({
        where: { id: coachRequest.clientId },
        data: { coachId: coachRequest.coachId },
      }),
    ]);
    return NextResponse.json({ success: true, action: 'accepted' });
  } else {
    await prisma.coachRequest.update({
      where: { id },
      data: { status: 'Rejected' },
    });
    return NextResponse.json({ success: true, action: 'rejected' });
  }
}
