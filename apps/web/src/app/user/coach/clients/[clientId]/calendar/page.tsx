import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import AppBarTitle from '@/components/shell/AppBarTitle';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { SignalBackLink } from '@/components/signal/SignalBackLink';
import Calendar from '@/app/user/calendar/Calendar';
import { getCoachClientCalendarData } from '@lib/coachCalendar';
import { SignalClientNav } from '../_components/SignalClientNav';

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientCalendarPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();
  const signalEnabled = await loadSignalFlag();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  const calendarData = await getCoachClientCalendarData(user.id, clientId);
  if (!calendarData) {
    notFound();
  }

  const dataUrl = `/api/calendar-data?clientId=${clientId}`;

  if (signalEnabled) {
    return (
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        <SignalBackLink href="/user/coach/clients" label="Clients" />
        <SignalClientNav clientId={clientId} />
        <Calendar
          events={calendarData.events}
          metrics={calendarData.metrics}
          userId={clientId}
          signalEnabled
          dataUrl={dataUrl}
          showLegacyAppBar={false}
        />
      </SignalSurface>
    );
  }

  return (
    <>
      <AppBarTitle title={client.name ? `${client.name}'s Calendar` : 'Calendar'} showBack backHref={`/user/coach/clients/${clientId}`} />
      <Calendar
        events={calendarData.events}
        metrics={calendarData.metrics}
        userId={clientId}
        dataUrl={dataUrl}
        showLegacyAppBar={false}
      />
    </>
  );
}
