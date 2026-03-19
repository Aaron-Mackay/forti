import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';
import { notFound } from 'next/navigation';
import { getUserEvents, getUserDayMetrics } from '@lib/api';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import NutritionClient from './NutritionClient';

export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;
  if (!userId) return notFound();

  const [dayMetrics, events, user] = await Promise.all([
    getUserDayMetrics(userId),
    getUserEvents(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        settings: true,
        clients: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!dayMetrics || !events || !user) return notFound();

  const settings = parseDashboardSettings(user.settings);
  const clients = settings.coachModeActive ? (user.clients ?? []) : [];

  return (
    <NutritionClient
      userId={userId}
      initialDayMetrics={dayMetrics}
      initialEvents={events}
      clients={clients}
      coachModeActive={settings.coachModeActive}
    />
  );
}
