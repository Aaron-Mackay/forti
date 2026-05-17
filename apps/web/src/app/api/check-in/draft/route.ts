import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/browser';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { getCheckInWeekStart, toDateOnly } from '@lib/checkInUtils';
import { getTemplateForClient } from '@lib/checkInTemplate';
import { parseCustomResponses } from '@/types/checkInTemplateTypes';
import { errorResponse } from '@lib/apiResponses';
import { validateCustomResponsesForDraft } from '@lib/checkInCustomResponseValidation';
import {
  SaveCheckInDraftRequestSchema,
  SaveCheckInDraftResponseSchema,
} from '@lib/contracts/checkIn';

export async function PATCH(req: Request) {
  const session = await requireSession();
  const userId = session.user.id;

  const bodyParse = SaveCheckInDraftRequestSchema.safeParse(await req.json());
  if (!bodyParse.success) {
    return errorResponse('Invalid check-in draft payload', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const { checkInDay } = parseDashboardSettings(user?.settings);
  const weekStart = toDateOnly(getCheckInWeekStart(new Date(), checkInDay));

  const [existing, template] = await Promise.all([
    prisma.weeklyCheckIn.findUnique({
      where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    }),
    getTemplateForClient(userId),
  ]);

  if (!template) {
    return errorResponse('No check-in template found for this user\'s coach', 400);
  }

  if (existing?.completedAt) {
    return errorResponse('Check-in has already been submitted', 409);
  }

  const responses = parseCustomResponses(bodyParse.data.customResponses);
  const validationError = validateCustomResponsesForDraft(responses, template);
  if (validationError) {
    return errorResponse(validationError, 400);
  }

  const checkIn = await prisma.weeklyCheckIn.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    create: {
      userId,
      weekStartDate: weekStart,
      customResponses: responses as unknown as Prisma.InputJsonValue,
      templateSnapshot: template as unknown as Prisma.InputJsonValue,
      completedWorkouts: typeof bodyParse.data.completedWorkouts === 'number' ? bodyParse.data.completedWorkouts : undefined,
      plannedWorkouts: typeof bodyParse.data.plannedWorkouts === 'number' ? bodyParse.data.plannedWorkouts : undefined,
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
      customResponses: responses as unknown as Prisma.InputJsonValue,
      templateSnapshot: template as unknown as Prisma.InputJsonValue,
      completedWorkouts: typeof bodyParse.data.completedWorkouts === 'number' ? bodyParse.data.completedWorkouts : undefined,
      plannedWorkouts: typeof bodyParse.data.plannedWorkouts === 'number' ? bodyParse.data.plannedWorkouts : undefined,
      energyLevel: null,
      moodRating: null,
      stressLevel: null,
      sleepQuality: null,
      recoveryRating: null,
      adherenceRating: null,
      weekReview: null,
      coachMessage: null,
      goalsNextWeek: null,
      completedAt: null,
    },
  });

  const mappedCheckIn = {
    ...checkIn,
    frontPhotoUrl: checkIn.frontPhotoUrl ? `/api/check-in/photos/${checkIn.id}/front` : null,
    backPhotoUrl: checkIn.backPhotoUrl ? `/api/check-in/photos/${checkIn.id}/back` : null,
    sidePhotoUrl: checkIn.sidePhotoUrl ? `/api/check-in/photos/${checkIn.id}/side` : null,
  };

  return NextResponse.json(SaveCheckInDraftResponseSchema.parse({ checkIn: mappedCheckIn }));
}
