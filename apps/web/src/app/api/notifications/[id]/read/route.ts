import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

/** PATCH /api/notifications/[id]/read — mark a single notification as read */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;
  const { id } = await params;
  const notificationId = parseInt(id, 10);

  if (isNaN(notificationId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });

  if (!notification || notification.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
