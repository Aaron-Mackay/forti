import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

/** PATCH /api/notifications/read-all — mark all unread notifications as read */
export async function PATCH() {
  const session = await requireSession();
  const userId = session.user.id;

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
