import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, notFoundResponse, forbiddenResponse, validationErrorResponse } from '@lib/apiResponses';
import { LearningPlanUpdateSchema } from '@lib/learningPlanSchemas';

async function getPlanForCoach(planId: number, coachId: string) {
  const user = await prisma.user.findUnique({
    where: { id: coachId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return null;

  return prisma.learningPlan.findUnique({
    where: { id: planId },
  });
}

/**
 * GET /api/coach/learning-plans/[planId]
 * Returns a single plan with its steps and assignments (including client info and progress).
 */
export async function GET(
  _req: NextRequest,
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

  const full = await prisma.learningPlan.findUnique({
    where: { id: planId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: { asset: { select: { id: true, title: true, type: true, url: true } } },
      },
      assignments: {
        orderBy: { createdAt: 'asc' },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({ plan: full });
}

/**
 * PATCH /api/coach/learning-plans/[planId]
 * Update plan title / description.
 */
export async function PATCH(
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
  const parsed = LearningPlanUpdateSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const updated = await prisma.learningPlan.update({
    where: { id: planId },
    data: parsed.data,
  });

  return NextResponse.json({ plan: updated });
}

/**
 * DELETE /api/coach/learning-plans/[planId]
 * Delete a plan and all its steps / assignments (cascade).
 */
export async function DELETE(
  _req: NextRequest,
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

  await prisma.learningPlan.delete({ where: { id: planId } });
  return new NextResponse(null, { status: 204 });
}
