import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import AppBarTitle from '@/components/shell/AppBarTitle';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { getUserEvents } from '@lib/eventService';
import { getUserMetrics } from '@lib/metricService';
import { getActivePlanWithStats } from '@lib/userService';
import { parseDashboardSettings } from '@/types/settingsTypes';
import DashboardCards from '@/app/user/(dashboard)/DashboardCards';
import DashboardChart from '@/app/user/(dashboard)/DashboardChart';
import E1rmProgressCard from '@/app/user/(dashboard)/E1rmProgressCard';
import ClientQuickLinks from './ClientQuickLinks';
import { Paper } from '@mui/material';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { Event as PrismaEvent, EventType } from '@/generated/prisma/browser';
import { SignalClientOverview } from './_components/SignalClientOverview';

interface Props {
  params: Promise<{ clientId: string }>;
}

const ClientOverviewPage = async ({ params }: Props) => {
  const { clientId } = await params;
  const user = await getLoggedInUser();

  const clientRecord = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true, settings: true },
  });

  if (!clientRecord || clientRecord.coachId !== user.id) {
    notFound();
  }

  const [signalEnabled, activePlanData, metrics, events, pendingReviewCheckIn, latestCheckIn] = await Promise.all([
    loadSignalFlag(),
    getActivePlanWithStats(clientId),
    getUserMetrics(clientId),
    getUserEvents(clientId),
    prisma.weeklyCheckIn.findFirst({
      where: {
        userId: clientId,
        completedAt: { not: null },
        coachReviewedAt: null,
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        weekStartDate: true,
        completedAt: true,
        coachReviewedAt: true,
      },
    }),
    prisma.weeklyCheckIn.findFirst({
      where: {
        userId: clientId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        weekStartDate: true,
        completedAt: true,
        coachReviewedAt: true,
      },
    }),
  ]);

  const clientSettings = parseDashboardSettings(clientRecord.settings);
  const latestMetric = metrics[metrics.length - 1] ?? null;
  const activeBlock = events.find((event: PrismaEvent) => {
    if (event.eventType !== EventType.BlockEvent) return false;
    const today = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return start <= today && end >= today;
  }) ?? null;

  if (signalEnabled) {
    return (
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        <SignalClientOverview
          clientId={clientId}
          clientName={clientRecord.name}
          activePlanData={activePlanData}
          latestMetric={latestMetric}
          activeBlock={activeBlock}
          latestCheckIn={latestCheckIn}
          pendingReviewCheckIn={pendingReviewCheckIn}
          bodyweightUnit={clientSettings.bodyweightUnit}
          today={new Date()}
        />
      </SignalSurface>
    );
  }

  // Show day metrics card but hide next workout and the editable today metrics entry
  const coachViewSettings = { ...clientSettings, showNextWorkout: false, showTodaysMetrics: true };

  return (
    <>
      <AppBarTitle title="Overview" showBack backHref="/user/coach/clients" />
      <Paper sx={{ px: 2, pt: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <ClientQuickLinks clientId={clientId} />
        <DashboardCards
          activePlanData={activePlanData}
          metrics={metrics}
          events={events}
          today={new Date()}
          userId={clientId}
          settings={coachViewSettings}
        />
        {metrics.length > 0 && (
          <DashboardChart
            metrics={metrics}
            blocks={events.filter((e: PrismaEvent) => e.eventType === EventType.BlockEvent)}
            bodyweightUnit={clientSettings.bodyweightUnit}
          />
        )}
        {clientSettings.trackedE1rmExercises.length > 0 && (
          <E1rmProgressCard
            exercises={clientSettings.trackedE1rmExercises}
            weightUnit={clientSettings.weightUnit}
          />
        )}
      </Paper>
    </>
  );
};

export default ClientOverviewPage;
