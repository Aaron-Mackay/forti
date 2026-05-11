import { NextResponse } from 'next/server';
import prisma from '@lib/prisma';
import { requireSession } from '@lib/requireSession';
import { notFoundResponse } from '@lib/apiResponses';
import { touchPlanActivity } from '@lib/planActivity';

export async function POST() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      activePlan: {
        select: {
          id: true,
          weeks: {
            orderBy: { order: 'asc' },
            select: {
              workouts: {
                select: { id: true, dateCompleted: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.activePlan) return notFoundResponse('Active plan');

  const activeWeek = user.activePlan.weeks.find((wk) =>
    wk.workouts.some((w) => !w.dateCompleted)
  );

  if (!activeWeek) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  const incompleteIds = activeWeek.workouts
    .filter((w) => !w.dateCompleted)
    .map((w) => w.id);

  const now = new Date();
  await prisma.workout.updateMany({
    where: { id: { in: incompleteIds } },
    data: { dateCompleted: now },
  });

  await touchPlanActivity(user.activePlan.id, now);

  return NextResponse.json({ success: true, updated: incompleteIds.length });
}
