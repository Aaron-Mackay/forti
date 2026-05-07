import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, notFoundResponse, forbiddenResponse, validationErrorResponse } from '@lib/apiResponses';
import { LearningPlanAssignSchema } from '@lib/learningPlanSchemas';

async function getPlanForCoach(planId: number, coachId: string) {
  const user = await prisma.user.findUnique({
    where: { id: coachId },
    select: { settings: true, clients: { select: { id: true } } },
  });
  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return { plan: null, clientIds: [], coachInactive: true };

  const plan = await prisma.learningPlan.findUnique({ where: { id: planId } });
  return { plan, clientIds: (user?.clients ?? []).map(c => c.id), coachInactive: false };
}

/**
 * POST /api/coach/learning-plans/[planId]/assignments
 * Assign a plan to a client.
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

  const { plan, clientIds, coachInactive } = await getPlanForCoach(planId, userId);
  if (coachInactive) return errorResponse('Coach mode is not active', 403);
  if (!plan) return notFoundResponse('Plan');
  if (plan.coachId !== userId) return forbiddenResponse();

  const body = await req.json();
  const parsed = LearningPlanAssignSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { clientId, startDate } = parsed.data;
  if (!clientIds.includes(clientId)) {
    return errorResponse('Client is not linked to this coach', 400);
  }

  const assignment = await prisma.learningPlanAssignment.upsert({
    where: { planId_clientId: { planId, clientId } },
    create: { planId, clientId, startDate },
    update: { startDate },
    include: { client: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
