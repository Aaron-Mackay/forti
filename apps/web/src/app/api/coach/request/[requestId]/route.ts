import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { notifyClientRequestAccepted } from '@lib/notifications';
import { errorResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@lib/apiResponses';
import { CoachRequestActionSchema } from '@lib/contracts/coach';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;

  const { requestId } = await params;
  const id = parseInt(requestId, 10);
  if (isNaN(id)) return errorResponse('Invalid requestId', 400);

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = CoachRequestActionSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const body = parsed.data;

  const coachRequest = await prisma.coachRequest.findUnique({
    where: { id },
    select: { id: true, clientId: true, coachId: true, status: true },
  });

  if (!coachRequest) return notFoundResponse('Request');
  if (coachRequest.coachId !== userId) return forbiddenResponse();
  if (coachRequest.status !== 'Pending') {
    return errorResponse('Request is no longer pending', 400);
  }

  if (body.action === 'accept') {
    const coachName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? 'Your coach';

    await prisma.$transaction([
      prisma.coachRequest.delete({ where: { id } }),
      prisma.user.update({
        where: { id: coachRequest.clientId },
        data: { coachId: coachRequest.coachId },
      }),
    ]);

    await notifyClientRequestAccepted(coachRequest.clientId, coachName)
      .catch(err => console.error('Failed to send client notification:', err));

    return NextResponse.json({ success: true, action: 'accepted' });
  } else {
    await prisma.coachRequest.update({
      where: { id },
      data: { status: 'Rejected' },
    });
    return NextResponse.json({ success: true, action: 'rejected' });
  }
}
