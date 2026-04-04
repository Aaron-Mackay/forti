import prisma from '@lib/prisma';
import { getAllTemplatesForUser } from '@lib/targetTemplates';

export async function getCoachClientNutritionData(coachId: string, clientId: string) {
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { coachId: true },
  });

  if (!client || client.coachId !== coachId) {
    return null;
  }

  const [dayMetrics, events, targetTemplates] = await Promise.all([
    prisma.dayMetric.findMany({
      where: { userId: clientId },
      orderBy: { date: 'asc' },
    }),
    prisma.event.findMany({
      where: { userId: clientId },
      orderBy: { startDate: 'asc' },
    }),
    getAllTemplatesForUser(clientId),
  ]);

  return { dayMetrics, events, targetTemplates };
}
