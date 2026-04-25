import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from '@lib/auditEvents';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { getCheckInWeekStart, toDateOnly } from '@lib/checkInUtils';
import { notifyCoachCheckInSubmitted } from '@lib/notifications';
import { getTemplateForClient } from '@lib/checkInTemplate';
import { parseCustomResponses } from '@/types/checkInTemplateTypes';
import type { CheckInTemplate, CheckInRatingField, CustomCheckInResponses } from '@/types/checkInTemplateTypes';
import { getAllInputFields } from '@/types/checkInTemplateTypes';
import { Prisma } from '@/generated/prisma/browser';
import { errorResponse } from '@lib/apiResponses';
import {
  CheckInHistoryResponseSchema,
  LegacyCheckInRequestSchema,
  SubmitCheckInRequestSchema,
  SubmitCheckInResponseSchema,
  TemplateCheckInRequestSchema,
} from '@lib/contracts/checkIn';

/** GET /api/check-in — fetch current user's check-in history (newest first) */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const excludeCurrent = searchParams.get('excludeCurrent') === 'true';

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const { checkInDay } = parseDashboardSettings(userRecord?.settings);
  const currentWeekStart = toDateOnly(getCheckInWeekStart(new Date(), checkInDay));
  const where = excludeCurrent
    ? { userId, NOT: { weekStartDate: currentWeekStart } }
    : { userId };

  const [checkIns, total] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where,
      orderBy: { weekStartDate: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.weeklyCheckIn.count({ where }),
  ]);

  const mappedCheckIns = checkIns.map(c => ({
    ...c,
    frontPhotoUrl: c.frontPhotoUrl ? `/api/check-in/photos/${c.id}/front` : null,
    backPhotoUrl: c.backPhotoUrl ? `/api/check-in/photos/${c.id}/back` : null,
    sidePhotoUrl: c.sidePhotoUrl ? `/api/check-in/photos/${c.id}/side` : null,
  }));

  return NextResponse.json(CheckInHistoryResponseSchema.parse({ checkIns: mappedCheckIns, total }));
}

/**
 * Validate customResponses against a template.
 * Returns an error string, or null if valid.
 */
function validateCustomResponses(
  responses: CustomCheckInResponses,
  template: CheckInTemplate,
): string | null {
  for (const field of getAllInputFields(template)) {
    const val = responses[field.id];
    if (field.type === 'rating') {
      const ratingField = field as CheckInRatingField;
      if (val === undefined || val === null) continue; // optional
      if (typeof val !== 'number' || !Number.isInteger(val) || val < ratingField.minScale || val > ratingField.maxScale) {
        return `"${field.label}" must be an integer between ${ratingField.minScale} and ${ratingField.maxScale}`;
      }
    } else if (field.type === 'text' || field.type === 'textarea') {
      if (val !== undefined && val !== null && typeof val !== 'string') {
        return `"${field.label}" must be a string`;
      }
    }
  }
  return null;
}

/** POST /api/check-in — submit (complete) this week's check-in */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const bodyParse = SubmitCheckInRequestSchema.safeParse(await req.json());
  if (!bodyParse.success) {
    return errorResponse('Invalid check-in payload', 400);
  }
  const body = bodyParse.data;

  // Fetch user settings and coach up-front
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      settings: true,
      coach: { select: { id: true, email: true, name: true } },
    },
  });
  const { checkInDay } = parseDashboardSettings(user?.settings);
  const weekStart = toDateOnly(getCheckInWeekStart(new Date(), checkInDay));

  const existing = await prisma.weeklyCheckIn.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  });
  const isEditingCompletedCheckIn = Boolean(existing?.completedAt);
  const completedAt = new Date();

  // Detect submission mode: template vs. legacy
  const templateParse = TemplateCheckInRequestSchema.safeParse(body);
  const isTemplateMode = templateParse.success;

  let checkIn;

  if (isTemplateMode) {
    // ── Template mode ──────────────────────────────────────────────────────
    const templateBody = templateParse.data;
    const template = await getTemplateForClient(userId);

    if (!template) {
      return errorResponse('No check-in template found for this user\'s coach', 400);
    }

    const responses = parseCustomResponses(templateBody.customResponses);
    const validationError = validateCustomResponses(responses, template);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    checkIn = await prisma.weeklyCheckIn.upsert({
      where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
      create: {
        userId,
        weekStartDate: weekStart,
        completedAt,
        customResponses: responses as unknown as Prisma.InputJsonValue,
        templateSnapshot: template as unknown as Prisma.InputJsonValue,
        completedWorkouts: typeof templateBody.completedWorkouts === 'number' ? templateBody.completedWorkouts : undefined,
        plannedWorkouts: typeof templateBody.plannedWorkouts === 'number' ? templateBody.plannedWorkouts : undefined,
        // Clear legacy columns
        energyLevel: null,
        moodRating: null,
        stressLevel: null,
        sleepQuality: null,
        recoveryRating: null,
        adherenceRating: null,
        weekReview: null,
        coachMessage: null,
        goalsNextWeek: null,
      },
      update: {
        completedAt,
        customResponses: responses as unknown as Prisma.InputJsonValue,
        templateSnapshot: template as unknown as Prisma.InputJsonValue,
        completedWorkouts: typeof templateBody.completedWorkouts === 'number' ? templateBody.completedWorkouts : undefined,
        plannedWorkouts: typeof templateBody.plannedWorkouts === 'number' ? templateBody.plannedWorkouts : undefined,
        // Clear legacy columns
        energyLevel: null,
        moodRating: null,
        stressLevel: null,
        sleepQuality: null,
        recoveryRating: null,
        adherenceRating: null,
        weekReview: null,
        coachMessage: null,
        goalsNextWeek: null,
      },
    });
  } else {
    // ── Legacy mode ────────────────────────────────────────────────────────
    const legacyBody = LegacyCheckInRequestSchema.parse(body);

    // Validate ratings are 1–5 when provided
    const ratingFields = ['energyLevel', 'moodRating', 'stressLevel', 'sleepQuality', 'recoveryRating', 'adherenceRating'] as const;
    for (const field of ratingFields) {
      const val = legacyBody[field];
      if (val !== undefined && (typeof val !== 'number' || val < 1 || val > 5)) {
        return NextResponse.json({ error: `${field} must be between 1 and 5` }, { status: 400 });
      }
    }

    checkIn = await prisma.weeklyCheckIn.upsert({
      where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
      create: {
        userId,
        weekStartDate: weekStart,
        completedAt,
        ...legacyBody,
        customResponses: Prisma.JsonNull,
        templateSnapshot: Prisma.JsonNull,
      },
      update: {
        completedAt,
        ...legacyBody,
        // Clear template-mode payload so legacy resubmissions render correctly.
        customResponses: Prisma.JsonNull,
        templateSnapshot: Prisma.JsonNull,
      },
    });
  }

  if (user?.coach && !isEditingCompletedCheckIn) {
    await notifyCoachCheckInSubmitted(
      user.coach.id,
      checkIn.id,
      user.name,
      weekStart,
      checkInDay,
    ).catch(err => console.error('Failed to send coach notification:', err));
  }

  await recordAuditEvent({
    actorUserId: userId,
    eventType: AuditEventType.CheckInSubmitted,
    analyticsEvent: 'checkin_submitted',
    analyticsData: {
      hasCoach: Boolean(user?.coach),
      isEdit: isEditingCompletedCheckIn,
    },
    subjectType: 'weekly_check_in',
    subjectId: checkIn.id,
    metadata: {
      checkInId: checkIn.id,
      weekStartDate: weekStart.toISOString(),
      hasCoach: Boolean(user?.coach),
      isEdit: isEditingCompletedCheckIn,
    },
  });

  const mappedCheckIn = {
    ...checkIn,
    frontPhotoUrl: checkIn.frontPhotoUrl ? `/api/check-in/photos/${checkIn.id}/front` : null,
    backPhotoUrl: checkIn.backPhotoUrl ? `/api/check-in/photos/${checkIn.id}/back` : null,
    sidePhotoUrl: checkIn.sidePhotoUrl ? `/api/check-in/photos/${checkIn.id}/side` : null,
  };
  return NextResponse.json(SubmitCheckInResponseSchema.parse({ checkIn: mappedCheckIn }), { status: isEditingCompletedCheckIn ? 200 : 201 });
}
