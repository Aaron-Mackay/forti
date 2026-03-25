import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, notFoundResponse, forbiddenResponse, validationErrorResponse } from '@lib/apiResponses';
import { LearningPlanStepUpdateSchema } from '@lib/learningPlanSchemas';

async function getStepForCoach(planId: number, stepId: number, coachId: string) {
  const user = await prisma.user.findUnique({
    where: { id: coachId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return { step: null, coachInactive: true };

  const step = await prisma.learningPlanStep.findUnique({
    where: { id: stepId },
    include: { plan: { select: { coachId: true } } },
  });
  return { step, coachInactive: false };
}

/**
 * PATCH /api/coach/learning-plans/[planId]/steps/[stepId]
 * Update a step's fields.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; stepId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;
  const { planId: planIdStr, stepId: stepIdStr } = await params;
  const planId = parseInt(planIdStr);
  const stepId = parseInt(stepIdStr);
  if (isNaN(planId) || isNaN(stepId)) return notFoundResponse('Step');

  const { step, coachInactive } = await getStepForCoach(planId, stepId, userId);
  if (coachInactive) return errorResponse('Coach mode is not active', 403);
  if (!step) return notFoundResponse('Step');
  if (step.planId !== planId || step.plan.coachId !== userId) return forbiddenResponse();

  const body = await req.json();
  const parsed = LearningPlanStepUpdateSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const updated = await prisma.learningPlanStep.update({
    where: { id: stepId },
    data: parsed.data,
    include: { asset: { select: { id: true, title: true, type: true, url: true } } },
  });

  return NextResponse.json({ step: updated });
}

/**
 * DELETE /api/coach/learning-plans/[planId]/steps/[stepId]
 * Delete a step and compact the remaining steps' order values.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string; stepId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;
  const { planId: planIdStr, stepId: stepIdStr } = await params;
  const planId = parseInt(planIdStr);
  const stepId = parseInt(stepIdStr);
  if (isNaN(planId) || isNaN(stepId)) return notFoundResponse('Step');

  const { step, coachInactive } = await getStepForCoach(planId, stepId, userId);
  if (coachInactive) return errorResponse('Coach mode is not active', 403);
  if (!step) return notFoundResponse('Step');
  if (step.planId !== planId || step.plan.coachId !== userId) return forbiddenResponse();

  await prisma.$transaction([
    prisma.learningPlanStep.delete({ where: { id: stepId } }),
    // Compact order: decrement order of all steps after the deleted one
    prisma.learningPlanStep.updateMany({
      where: { planId, order: { gt: step.order } },
      data: { order: { decrement: 1 } },
    }),
  ]);

  return new NextResponse(null, { status: 204 });
}
