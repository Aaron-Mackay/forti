import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
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

  const latestChangeMs = notifications.reduce((latest, notification) => {
    const createdAtMs = notification.createdAt.getTime();
    const readAtMs = notification.readAt?.getTime() ?? 0;
    return Math.max(latest, createdAtMs, readAtMs);
  }, 0);
  const lastModifiedDate = latestChangeMs > 0 ? new Date(latestChangeMs) : new Date(0);
  const lastModified = lastModifiedDate.toUTCString();
  const version = `${latestChangeMs}:${notifications.length}:${unreadCount}`;
  const etag = `W/\"${version}\"`;

  const requestHeaders = await headers();
  const ifNoneMatch = requestHeaders.get('if-none-match');
  const ifModifiedSince = requestHeaders.get('if-modified-since');
  const notModifiedByEtag = ifNoneMatch === etag;
  const notModifiedByDate = ifModifiedSince ? new Date(ifModifiedSince).getTime() >= lastModifiedDate.getTime() : false;

  if (notModifiedByEtag || notModifiedByDate) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Last-Modified': lastModified,
      },
    });
  }

  const payload: NotificationsListResponse = NotificationsListResponseSchema.parse({
    notifications,
    unreadCount,
    metadata: {
      version,
      etag,
      lastModified: lastModifiedDate.toISOString(),
    },
  });
  return NextResponse.json(payload, {
    headers: {
      ETag: etag,
      'Last-Modified': lastModified,
      'Cache-Control': 'private, no-cache',
    },
  });
}
