import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, notFoundResponse, forbiddenResponse, validationErrorResponse } from '@lib/apiResponses';
import { LearningPlanStepReorderSchema } from '@lib/learningPlanSchemas';

/**
 * PUT /api/coach/learning-plans/[planId]/steps/reorder
 * Reorder steps by supplying the full ordered array of step IDs.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;
  const { planId: planIdStr } = await params;
  const planId = parseInt(planIdStr);
  if (isNaN(planId)) return notFoundResponse('Plan');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return errorResponse('Coach mode is not active', 403);

  const plan = await prisma.learningPlan.findUnique({ where: { id: planId } });
  if (!plan) return notFoundResponse('Plan');
  if (plan.coachId !== userId) return forbiddenResponse();

  const body = await req.json();
  const parsed = LearningPlanStepReorderSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { stepIds } = parsed.data;

  await prisma.$transaction(
    stepIds.map((id, index) =>
      prisma.learningPlanStep.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  return new NextResponse(null, { status: 204 });
}
