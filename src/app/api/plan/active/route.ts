import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@lib/prisma';
import { requireSession } from '@lib/requireSession';
import { errorResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@lib/apiResponses';
import { withRouteAuth } from '@lib/routeAuth';

const ActivePlanSchema = z.object({
  planId: z.number().int().positive().nullable(),
  targetUserId: z.string().optional(),
});

export const PATCH = withRouteAuth(async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const parsed = ActivePlanSchema.safeParse(await req.json());

  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const { planId, targetUserId } = parsed.data;
  const sessionUserId = session.user.id;
  const userId = targetUserId ?? sessionUserId;

  if (userId !== sessionUserId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { coachId: true },
    });

    if (!targetUser || targetUser.coachId !== sessionUserId) {
      return forbiddenResponse();
    }
  }

  if (planId === null) {
    await prisma.user.update({
      where: { id: userId },
      data: { activePlanId: null },
    });

    return NextResponse.json({ success: true, activePlanId: null });
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, userId: true },
  });

  if (!plan) {
    return notFoundResponse('Plan');
  }

  if (plan.userId !== userId) {
    return forbiddenResponse();
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { activePlanId: plan.id },
      select: { activePlanId: true },
    });

    return NextResponse.json({ success: true, activePlanId: updatedUser.activePlanId });
  } catch (error) {
    console.error(error);
    return errorResponse('Failed to update active plan', 500);
  }
});
