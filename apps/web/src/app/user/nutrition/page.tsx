import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';
import { notFound } from 'next/navigation';
import { getUserEvents } from '@lib/eventService';
import { getUserMetrics } from '@lib/metricService';
import { getActiveTemplateForWeek } from '@lib/targetTemplates';
import { getWeekStart } from '@lib/checkInUtils';
import NutritionClient from './NutritionClient';

export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;
  if (!userId) return notFound();

  const weekMonday = getWeekStart(new Date());
  const [metrics, events, initialTemplate] = await Promise.all([
    getUserMetrics(userId),
    getUserEvents(userId),
    getActiveTemplateForWeek(userId, weekMonday),
  ]);

  if (!metrics || !events) return notFound();

  return (
    <NutritionClient
      userId={userId}
      initialMetrics={metrics}
      initialEvents={events}
      initialTemplate={initialTemplate}
    />
  );
}
