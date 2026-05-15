import getLoggedInUser from '@lib/getLoggedInUser';
import { getUserEvents } from '@lib/eventService';
import { getUserMetrics } from '@lib/metricService';
import { getActivePlanWithStats } from '@lib/userService';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { redirect } from 'next/navigation';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { LegacyProgress } from './_components/LegacyProgress';
import { SignalProgress } from './_components/SignalProgress';

export default async function ProgressPage() {
  const user = await getLoggedInUser();
  const [metrics, events, activePlanData, userRecord] = await Promise.all([
    getUserMetrics(user.id),
    getUserEvents(user.id),
    getActivePlanWithStats(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { settings: true } }),
  ]);

  const settings = parseDashboardSettings(userRecord?.settings);

  if (!settings.registrationComplete) {
    redirect('/user/onboarding');
  }

  const signalEnabled = settings.signalUiEnabled;
  const today = new Date();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      {signalEnabled ? (
        <SignalProgress
          userName={user.name}
          metrics={metrics}
          events={events}
          settings={settings}
        />
      ) : (
        <LegacyProgress
          metrics={metrics}
          events={events}
          activePlanData={activePlanData}
          settings={settings}
          today={today}
        />
      )}
    </SignalSurface>
  );
}
