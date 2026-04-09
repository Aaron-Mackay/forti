import prisma from '@lib/prisma';
import { toDateOnly } from '@lib/checkInUtils';

export async function touchPlanActivity(planId: number, now: Date = new Date()) {
  const today = toDateOnly(now);

  await prisma.plan.updateMany({
    where: {
      id: planId,
      OR: [
        { lastActivityDate: null },
        { lastActivityDate: { lt: today } },
      ],
    },
    data: {
      lastActivityDate: today,
    },
  });
}
