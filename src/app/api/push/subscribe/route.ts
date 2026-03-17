import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';

interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** POST /api/push/subscribe — register a push subscription for the current user */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const body = await req.json() as PushSubscriptionBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    update: {
      userId,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe — unregister a push subscription */
export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const body = await req.json() as { endpoint: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint, userId },
  });

  return NextResponse.json({ ok: true });
}
