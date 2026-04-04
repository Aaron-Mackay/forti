import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';
import { notFound } from 'next/navigation';
import { getUserEvents, getUserDayMetrics } from '@lib/api';
import { getActiveTemplateForWeek } from '@lib/targetTemplates';
import { getWeekStart } from '@lib/checkInUtils';
import NutritionClient from './NutritionClient';

export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;
  if (!userId) return notFound();

  const weekMonday = getWeekStart(new Date());
  const [dayMetrics, events, initialTemplate] = await Promise.all([
    getUserDayMetrics(userId),
    getUserEvents(userId),
    getActiveTemplateForWeek(userId, weekMonday),
  ]);

  if (!dayMetrics || !events) return notFound();

  return (
    <NutritionClient
      userId={userId}
      initialDayMetrics={dayMetrics}
      initialEvents={events}
      initialTemplate={initialTemplate}
    />
  );
}
