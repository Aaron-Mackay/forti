import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, notFoundResponse, forbiddenResponse } from '@lib/apiResponses';

/**
 * DELETE /api/coach/learning-plans/[planId]/assignments/[assignmentId]
 * Remove a client assignment.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string; assignmentId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;
  const { planId: planIdStr, assignmentId: assignmentIdStr } = await params;
  const planId = parseInt(planIdStr);
  const assignmentId = parseInt(assignmentIdStr);
  if (isNaN(planId) || isNaN(assignmentId)) return notFoundResponse('Assignment');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return errorResponse('Coach mode is not active', 403);

  const assignment = await prisma.learningPlanAssignment.findUnique({
    where: { id: assignmentId },
    include: { plan: { select: { coachId: true } } },
  });
  if (!assignment) return notFoundResponse('Assignment');
  if (assignment.planId !== planId || assignment.plan.coachId !== userId) return forbiddenResponse();

  await prisma.learningPlanAssignment.delete({ where: { id: assignmentId } });
  return new NextResponse(null, { status: 204 });
}
