import { NextRequest, NextResponse } from 'next/server';
import prisma from '@lib/prisma';
import { notifyClientLearningPlanStep } from '@lib/notifications';
import { StepProgressSchema, type StepProgressMap } from '@lib/learningPlanSchemas';
import { unauthenticatedResponse } from '@lib/apiResponses';

/**
 * GET /api/cron/learning-plan-steps
 * Runs daily at 08:00 UTC via Vercel Cron (see vercel.json).
 * For each active assignment, finds steps whose dayOffset falls on today
 * and which have not yet been notified, then delivers them.
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthenticatedResponse();
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const assignments = await prisma.learningPlanAssignment.findMany({
    include: {
      plan: {
        include: { steps: { orderBy: { order: 'asc' } } },
      },
    },
  });

  let delivered = 0;

  for (const assignment of assignments) {
    const parsed = StepProgressSchema.safeParse(assignment.stepProgress ?? {});
    const progress: StepProgressMap = parsed.success ? parsed.data : {};
    let changed = false;

    const startDate = new Date(assignment.startDate);
    startDate.setUTCHours(0, 0, 0, 0);

    for (const step of assignment.plan.steps) {
      const deliverOn = new Date(startDate);
      deliverOn.setUTCDate(deliverOn.getUTCDate() + step.dayOffset - 1);

      if (deliverOn.getTime() !== today.getTime()) continue;

      const existing = progress[String(step.id)];
      if (existing?.notifiedAt) continue; // already notified

      // Deliver notification
      await notifyClientLearningPlanStep(
        assignment.clientId,
        step.title,
        step.body,
      ).catch(err => console.error(`Learning plan step notification failed for assignment ${assignment.id}:`, err));

      progress[String(step.id)] = {
        notifiedAt: new Date().toISOString(),
        completedAt: existing?.completedAt ?? null,
      };
      changed = true;
      delivered++;
    }

    if (changed) {
      await prisma.learningPlanAssignment.update({
        where: { id: assignment.id },
        data: { stepProgress: progress },
      });
    }
  }

  return NextResponse.json({ delivered });
}
