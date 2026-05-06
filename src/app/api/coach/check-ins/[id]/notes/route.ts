import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';
import prisma from '@lib/prisma';
import { notifyClientCoachFeedback } from '@lib/notifications';
import { getCoachCheckInById } from '@lib/coachCheckIns';
import { errorResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@lib/apiResponses';
import { CoachCheckInNotesRequestSchema } from '@lib/contracts/coach';

/** PATCH /api/coach/check-ins/[id]/notes — coach saves notes on a client's check-in */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const coachId = session.user.id;
  const { id } = await params;
  const checkInId = parseInt(id);

  if (isNaN(checkInId)) return errorResponse('Invalid id', 400);

  const checkInResult = await getCoachCheckInById(coachId, checkInId);
  if (checkInResult.status === 'forbidden') return forbiddenResponse('Coach mode is not active');
  if (checkInResult.status === 'not_found') return notFoundResponse('Check-in');

  const { checkIn } = checkInResult;

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsedBody = CoachCheckInNotesRequestSchema.safeParse(json);
  if (!parsedBody.success) return validationErrorResponse(parsedBody.error);

  const body = parsedBody.data;
  const trimmedCoachResponseUrl = body.coachResponseUrl?.trim() ?? '';
  if (trimmedCoachResponseUrl) {
    try {
      const parsedUrl = new URL(trimmedCoachResponseUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return errorResponse('coachResponseUrl must be a valid http(s) URL', 400);
    }
  }

  const updated = await prisma.weeklyCheckIn.update({
    where: { id: checkInId },
    data: {
      coachNotes: body.coachNotes,
      coachResponseUrl: trimmedCoachResponseUrl || null,
      coachReviewedAt: new Date(),
    },
  });

  const coachName = (await prisma.user.findUnique({ where: { id: coachId }, select: { name: true } }))?.name ?? 'Your coach';
  await notifyClientCoachFeedback(checkIn.userId, coachName)
    .catch(err => console.error('Failed to send client notification:', err));

  await recordAuditEvent({
    actorUserId: coachId,
    eventType: AuditEventType.CheckInReviewed,
    analyticsEvent: 'checkin_reviewed',
    analyticsData: {
      hasResponseUrl: Boolean(trimmedCoachResponseUrl),
    },
    subjectType: 'weekly_check_in',
    subjectId: checkInId,
    metadata: {
      checkInId,
      clientUserId: checkIn.userId,
      hasResponseUrl: Boolean(trimmedCoachResponseUrl),
    },
  });

  return NextResponse.json({ checkIn: updated });
}
