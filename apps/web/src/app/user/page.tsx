import getLoggedInUser from "@lib/getLoggedInUser";
import {HEIGHT_EXC_APPBAR} from "@/components/shell/CustomAppBar";
import AppBarTitle from "@/components/shell/AppBarTitle";
import {Paper, Typography} from "@mui/material";
import DashboardChart from "@/app/user/(dashboard)/DashboardChart";
import DashboardCards from "@/app/user/(dashboard)/DashboardCards";
import E1rmProgressCard from "@/app/user/(dashboard)/E1rmProgressCard";
import {getUserEvents} from "@lib/eventService";
import {getUserMetrics} from "@lib/metricService";
import {getActivePlanWithStats} from "@lib/userService";
import {Event as PrismaEvent, EventType} from "@/generated/prisma/browser";
import prisma from "@lib/prisma";
import {parseDashboardSettings} from "@/types/settingsTypes";
import {redirect} from "next/navigation";
import { SignalHome } from "./_components/SignalHome";
import { SignalSurface } from "@/components/signal/SignalSurface";
import { getCheckInWeekStart, toDateOnly } from "@lib/checkInUtils";

export default async function UserPage() {
  const user = await getLoggedInUser()
  const [userMetrics, allEvents, activePlanData, userRecord] = await Promise.all([
    getUserMetrics(user.id),
    getUserEvents(user.id),
    getActivePlanWithStats(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { settings: true, coachId: true } }),
  ])
  const userBlocks = allEvents.filter((ev: PrismaEvent) => ev.eventType === EventType.BlockEvent)
  const settings = parseDashboardSettings(userRecord?.settings)

  if (!settings.registrationComplete) {
    redirect('/user/onboarding');
  }

  const signalEnabled = settings.signalUiEnabled;

  // For coached users in Signal mode, determine if this week's check-in is still pending
  let checkInPending = false;
  if (signalEnabled && userRecord?.coachId) {
    const weekStart = toDateOnly(getCheckInWeekStart(new Date(), settings.checkInDay));
    const checkIn = await prisma.weeklyCheckIn.findUnique({
      where: { userId_weekStartDate: { userId: user.id, weekStartDate: weekStart } },
      select: { completedAt: true },
    });
    checkInPending = checkIn?.completedAt == null;
  }

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      {signalEnabled ? (
        <SignalHome
          userId={user.id}
          activePlanData={activePlanData}
          metrics={userMetrics}
          settings={settings}
          today={new Date()}
          checkInPending={checkInPending}
        />
      ) : (
        <>
          <AppBarTitle title="Dashboard" />
          <Paper sx={{px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto'}}>
            <Typography variant={'h4'} sx={{paddingTop: 2, paddingBottom: 2}}>
              {`Welcome ${user.name?.split(' ')[0]}`}
            </Typography>
            <DashboardCards
              activePlanData={activePlanData}
              metrics={userMetrics}
              events={allEvents}
              today={new Date()}
              userId={user.id}
              settings={settings}
            />
            {settings.showMetricsChart
              && userMetrics.length > 0
              && <DashboardChart metrics={userMetrics} blocks={userBlocks} bodyweightUnit={settings.bodyweightUnit}/>}
            {settings.showE1rmProgress
              && settings.trackedE1rmExercises.length > 0
              && <E1rmProgressCard exercises={settings.trackedE1rmExercises} weightUnit={settings.weightUnit}/>}
          </Paper>
        </>
      )}
    </SignalSurface>
  );
}
