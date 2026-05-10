import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';
import { notFound } from 'next/navigation';
import { getUserEvents } from '@lib/eventService';
import { getUserMetrics } from '@lib/metricService';
import { getActiveTemplateForWeek } from '@lib/targetTemplates';
import { getWeekStart } from '@lib/checkInUtils';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';
import NutritionClient from './NutritionClient';

export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;
  if (!userId) return notFound();

  const weekMonday = getWeekStart(new Date());
  const [metrics, events, initialTemplate, signalEnabled] = await Promise.all([
    getUserMetrics(userId),
    getUserEvents(userId),
    getActiveTemplateForWeek(userId, weekMonday),
    loadSignalFlag(),
  ]);

  if (!metrics || !events) return notFound();

  if (signalEnabled) {
    return (
      <SignalSurface signalEnabled surface="planning">
        <NutritionClient
          userId={userId}
          initialMetrics={metrics}
          initialEvents={events}
          initialTemplate={initialTemplate}
          signalEnabled
        />
      </SignalSurface>
    );
  }

  return (
    <NutritionClient
      userId={userId}
      initialMetrics={metrics}
      initialEvents={events}
      initialTemplate={initialTemplate}
    />
  );
}
