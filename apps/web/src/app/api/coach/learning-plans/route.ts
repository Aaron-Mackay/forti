import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { LearningPlanCreateSchema } from '@lib/learningPlanSchemas';

async function requireCoach(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return null;
  return true;
}

/**
 * GET /api/coach/learning-plans
 * Returns all learning plans created by the authenticated coach.
 */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  if (!(await requireCoach(userId))) {
    return errorResponse('Coach mode is not active', 403);
  }

  const plans = await prisma.learningPlan.findMany({
    where: { coachId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { steps: true, assignments: true } },
    },
  });

  return NextResponse.json({ plans });
}

/**
 * POST /api/coach/learning-plans
 * Create a new learning plan.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  if (!(await requireCoach(userId))) {
    return errorResponse('Coach mode is not active', 403);
  }

  const body = await req.json();
  const parsed = LearningPlanCreateSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const plan = await prisma.learningPlan.create({
    data: {
      coachId: userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    },
    include: { _count: { select: { steps: true, assignments: true } } },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
