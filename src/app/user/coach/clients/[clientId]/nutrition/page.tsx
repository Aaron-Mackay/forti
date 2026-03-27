import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import NutritionClient from '@/app/user/nutrition/NutritionClient';

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientNutritionPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  const [dayMetrics, events] = await Promise.all([
    prisma.dayMetric.findMany({
      where: { userId: clientId },
      orderBy: { date: 'asc' },
    }),
    prisma.event.findMany({
      where: { userId: clientId },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  return (
    <NutritionClient
      userId={clientId}
      initialDayMetrics={dayMetrics}
      initialEvents={events}
      readOnly
    />
  );
}
