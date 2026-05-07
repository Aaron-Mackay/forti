import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, notFoundResponse, forbiddenResponse, validationErrorResponse } from '@lib/apiResponses';
import { LearningPlanStepCreateSchema } from '@lib/learningPlanSchemas';

async function getPlanForCoach(planId: number, coachId: string) {
  const user = await prisma.user.findUnique({
    where: { id: coachId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return null;
  return prisma.learningPlan.findUnique({ where: { id: planId } });
}

/**
 * POST /api/coach/learning-plans/[planId]/steps
 * Append a new step to the plan.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;
  const { planId: planIdStr } = await params;
  const planId = parseInt(planIdStr);
  if (isNaN(planId)) return notFoundResponse('Plan');

  const plan = await getPlanForCoach(planId, userId);
  if (plan === null) return errorResponse('Coach mode is not active', 403);
  if (!plan) return notFoundResponse('Plan');
  if (plan.coachId !== userId) return forbiddenResponse();

  const body = await req.json();
  const parsed = LearningPlanStepCreateSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  // Determine next order value
  const maxOrder = await prisma.learningPlanStep.aggregate({
    where: { planId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const step = await prisma.learningPlanStep.create({
    data: {
      planId,
      order: nextOrder,
      dayOffset: parsed.data.dayOffset,
      title: parsed.data.title,
      body: parsed.data.body,
      assetId: parsed.data.assetId ?? null,
    },
    include: { asset: { select: { id: true, title: true, type: true, url: true } } },
  });

  return NextResponse.json({ step }, { status: 201 });
}
