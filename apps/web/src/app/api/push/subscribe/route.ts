import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { PushSubscribeRequestSchema, PushUnsubscribeRequestSchema } from '@lib/contracts/push';

/** POST /api/push/subscribe — register a push subscription for the current user */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = PushSubscribeRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const body = parsed.data;

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

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = PushUnsubscribeRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId },
  });

  return NextResponse.json({ ok: true });
}
