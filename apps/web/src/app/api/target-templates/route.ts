import { NextRequest, NextResponse } from 'next/server';
import { requireSession, authenticationErrorResponse, isAuthenticationError } from '@lib/requireSession';
import { getActiveTemplateForWeek, upsertTargetTemplate } from '@lib/targetTemplates';
import { GetTargetTemplateResponseSchema, TargetTemplateRequestSchema, TargetTemplateResponseSchema } from '@lib/contracts/targetTemplates';
import { errorResponse, validationErrorResponse, forbiddenResponse } from '@lib/apiResponses';
import { getWeekStart } from '@lib/checkInUtils';
import prisma from '@lib/prisma';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const weekStartParam = req.nextUrl.searchParams.get('weekStart');
    if (!weekStartParam) {
      return errorResponse('weekStart query parameter is required', 400);
    }

    const parsedDate = new Date(weekStartParam);
    if (isNaN(parsedDate.getTime())) {
      return errorResponse('weekStart must be a valid date (YYYY-MM-DD)', 400);
    }

    const weekMonday = getWeekStart(parsedDate);
    const template = await getActiveTemplateForWeek(userId, weekMonday);
    return NextResponse.json(GetTargetTemplateResponseSchema.parse({ template }));
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return errorResponse('Failed to fetch target template', 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const sessionUserId = session.user.id;

    const json = await req.json();
    const parsed = TargetTemplateRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { effectiveFrom, stepsTarget, sleepMinsTarget, days, targetUserId } = parsed.data;
    const userId = targetUserId ?? sessionUserId;

    // If writing on behalf of another user, verify the session user is their coach
    if (userId !== sessionUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { coachId: true },
      });
      if (!targetUser || targetUser.coachId !== sessionUserId) {
        return forbiddenResponse();
      }
    }

    const weekMonday = getWeekStart(new Date(effectiveFrom));

    // Coerce string keys ("1"–"7") to numbers and validate range
    const parsedDays: Record<number, { caloriesTarget: number | null; proteinTarget: number | null; carbsTarget: number | null; fatTarget: number | null }> = {};
    for (const [key, macros] of Object.entries(days)) {
      const dow = parseInt(key, 10);
      if (isNaN(dow) || dow < 1 || dow > 7) {
        return errorResponse(`Invalid day-of-week key: ${key}. Must be 1–7.`, 400);
      }
      parsedDays[dow] = {
        caloriesTarget: macros.caloriesTarget ?? null,
        proteinTarget: macros.proteinTarget ?? null,
        carbsTarget: macros.carbsTarget ?? null,
        fatTarget: macros.fatTarget ?? null,
      };
    }

    const template = await upsertTargetTemplate(
      userId,
      weekMonday,
      {
        stepsTarget: stepsTarget ?? null,
        sleepMinsTarget: sleepMinsTarget ?? null,
      },
      parsedDays,
    );

    return NextResponse.json(TargetTemplateResponseSchema.parse(template));
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return errorResponse('Failed to save target template', 500);
  }
}
