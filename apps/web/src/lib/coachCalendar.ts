import prisma from '@lib/prisma';
import { getUserEvents } from '@lib/eventService';
import { getUserMetrics } from '@lib/metricService';

export async function getCoachClientCalendarData(coachId: string, clientId: string) {
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { coachId: true },
  });

  if (!client || client.coachId !== coachId) {
    return null;
  }

  const [events, metrics] = await Promise.all([
    getUserEvents(clientId),
    getUserMetrics(clientId),
  ]);

  return { events, metrics };
}
