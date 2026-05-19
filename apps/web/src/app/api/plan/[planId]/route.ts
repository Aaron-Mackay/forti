import { NextRequest, NextResponse } from 'next/server';
import prisma from '@lib/prisma';
import { requireSession } from '@lib/requireSession';
import { errorResponse, forbiddenResponse, notFoundResponse } from '@lib/apiResponses';
import { withApiRoute } from '@lib/routeAuth';
import { logUnexpectedError, type RequestLogContext } from '@lib/apiLogging';

export const DELETE = withApiRoute({ route: '/api/plan/[planId]' }, async function DELETE(
  ctx: RequestLogContext,
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const session = await requireSession();
  const { planId } = await params;
  const planIdNum = Number(planId);
  if (!Number.isInteger(planIdNum) || planIdNum <= 0) return notFoundResponse('Plan');

  const plan = await prisma.plan.findUnique({
    where: { id: planIdNum },
    select: {
      id: true,
      userId: true,
      user: { select: { coachId: true, activePlanId: true } },
    },
  });

  if (!plan) return notFoundResponse('Plan');
  const sessionUserId = session.user.id;
  const canDelete = plan.userId === sessionUserId || plan.user.coachId === sessionUserId;
  if (!canDelete) return forbiddenResponse();

  try {
    await prisma.$transaction(async (tx) => {
      if (plan.user.activePlanId === plan.id) {
        await tx.user.update({
          where: { id: plan.userId },
          data: { activePlanId: null },
        });
      }
      await tx.plan.delete({ where: { id: plan.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logUnexpectedError(ctx, error, { planId: plan.id, userId: plan.userId });
    return errorResponse('Failed to delete plan', 500);
  }
});
