import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

/** GET /api/notifications — fetch all notifications for the logged-in user */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return NextResponse.json({ notifications, unreadCount });
}
