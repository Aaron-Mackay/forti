import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import {
  NotificationsListResponseSchema,
  type NotificationsListResponse,
} from '@lib/contracts/notifications';

/** GET /api/notifications — fetch all notifications for the logged-in user */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const payload: NotificationsListResponse = NotificationsListResponseSchema.parse({
    notifications,
    unreadCount,
  });
  return NextResponse.json(payload);
}
