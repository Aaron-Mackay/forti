import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import AppBarTitle from '@/components/AppBarTitle';
import { getUserData, getUserDayMetrics, getUserEvents } from '@lib/api';
import { parseDashboardSettings } from '@/types/settingsTypes';
import DashboardCards from '@/app/user/(dashboard)/DashboardCards';
import DashboardChart from '@/app/user/(dashboard)/DashboardChart';
import E1rmProgressCard from '@/app/user/(dashboard)/E1rmProgressCard';
import ClientQuickLinks from './ClientQuickLinks';
import { Paper } from '@mui/material';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { EventType } from '@prisma/client';

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

  const [userData, dayMetrics, events] = await Promise.all([
    getUserData(clientId),
    getUserDayMetrics(clientId),
    getUserEvents(clientId),
  ]);

  const clientSettings = parseDashboardSettings(clientRecord.settings);
  // Show day metrics card but hide next workout and the editable today metrics entry
  const coachViewSettings = { ...clientSettings, showNextWorkout: false, showTodaysMetrics: true };

  return (
    <>
      <AppBarTitle title="Overview" />
      <Paper sx={{ px: 2, pt: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <ClientQuickLinks clientId={clientId} />
        <DashboardCards
          userData={userData}
          dayMetrics={dayMetrics}
          events={events}
          today={new Date()}
          userId={clientId}
          settings={coachViewSettings}
        />
        {dayMetrics.length > 0 && (
          <DashboardChart
            dayMetrics={dayMetrics}
            blocks={events.filter(e => e.eventType === EventType.BlockEvent)}
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
