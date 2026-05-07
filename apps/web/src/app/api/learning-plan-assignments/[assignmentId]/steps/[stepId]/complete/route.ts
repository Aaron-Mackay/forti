import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { notFoundResponse, forbiddenResponse } from '@lib/apiResponses';
import { StepProgressSchema, type StepProgressMap } from '@lib/learningPlanSchemas';

/**
 * PATCH /api/learning-plan-assignments/[assignmentId]/steps/[stepId]/complete
 * Toggle a step's completedAt. Body: { completed: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; stepId: string }> }
) {
  const session = await requireSession();
  const userId = session.user.id;
  const { assignmentId: assignmentIdStr, stepId: stepIdStr } = await params;
  const assignmentId = parseInt(assignmentIdStr);
  const stepId = parseInt(stepIdStr);
  if (isNaN(assignmentId) || isNaN(stepId)) return notFoundResponse('Assignment');

  const assignment = await prisma.learningPlanAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) return notFoundResponse('Assignment');
  if (assignment.clientId !== userId) return forbiddenResponse();

  // Verify the step belongs to this plan
  const step = await prisma.learningPlanStep.findUnique({ where: { id: stepId } });
  if (!step || step.planId !== assignment.planId) return notFoundResponse('Step');

  const { completed } = await req.json() as { completed: boolean };

  const parsed = StepProgressSchema.safeParse(assignment.stepProgress ?? {});
  const progress: StepProgressMap = parsed.success ? parsed.data : {};

  const existing = progress[String(stepId)] ?? { notifiedAt: null, completedAt: null };
  progress[String(stepId)] = {
    ...existing,
    completedAt: completed ? new Date().toISOString() : null,
  };

  const updated = await prisma.learningPlanAssignment.update({
    where: { id: assignmentId },
    data: { stepProgress: progress },
  });

  return NextResponse.json({ stepProgress: updated.stepProgress });
}
