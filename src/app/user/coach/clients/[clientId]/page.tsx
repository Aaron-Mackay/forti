import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import AppBarTitle from '@/components/AppBarTitle';
import { getUserData, getUserDayMetrics, getUserEvents } from '@lib/api';
import { parseDashboardSettings } from '@/types/settingsTypes';
import DashboardCards from '@/app/user/(dashboard)/DashboardCards';
import ClientQuickLinks from './ClientQuickLinks';

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

  // Use the client's settings but disable the day metrics entry card for coaches
  const clientSettings = parseDashboardSettings(clientRecord.settings);
  const coachViewSettings = { ...clientSettings, showTodaysMetrics: false };

  return (
    <>
      <AppBarTitle title={clientRecord.name ?? 'Client'} />
      <ClientQuickLinks clientId={clientId} />
      <DashboardCards
        userData={userData}
        dayMetrics={dayMetrics}
        events={events}
        today={new Date()}
        userId={clientId}
        settings={coachViewSettings}
      />
    </>
  );
};

export default ClientOverviewPage;
