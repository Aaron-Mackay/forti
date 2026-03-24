import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import CustomAppBar, {HEIGHT_EXC_APPBAR} from "@/components/CustomAppBar";
import {Paper, Typography} from "@mui/material";
import DashboardChart from "@/app/user/(dashboard)/DashboardChart";
import DashboardCards from "@/app/user/(dashboard)/DashboardCards";
import E1rmProgressCard from "@/app/user/(dashboard)/E1rmProgressCard";
import {getUserData, getUserDayMetrics, getUserEvents} from "@lib/api";
import {EventType} from "@prisma/client";
import prisma from "@lib/prisma";
import {parseDashboardSettings} from "@/types/settingsTypes";
import {redirect} from "next/navigation";

export default async function UserPage() {
  const user = await getLoggedInUser()
  const [userDayMetrics, allEvents, userData, userRecord] = await Promise.all([
    getUserDayMetrics(user.id),
    getUserEvents(user.id),
    getUserData(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { settings: true } }),
  ])
  const userBlocks = allEvents.filter(ev => ev.eventType === EventType.BlockEvent)
  const settings = parseDashboardSettings(userRecord?.settings)

  if (!settings.registrationComplete) {
    redirect('/user/onboarding');
  }

  return (
    <>
      <CustomAppBar title={"Dashboard"}/>
      <Paper sx={{px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto'}}>
        <Typography variant={'h4'} sx={{paddingTop: 2, paddingBottom: 2}}>
          {`Welcome ${user.name?.split(' ')[0]}`}
        </Typography>
        <DashboardCards
          userData={userData}
          dayMetrics={userDayMetrics}
          events={allEvents}
          today={new Date()}
          userId={user.id}
          settings={settings}
        />
        {settings.showMetricsChart
          && userDayMetrics.length > 0
          && <DashboardChart dayMetrics={userDayMetrics} blocks={userBlocks}/>}
        {settings.showE1rmProgress
          && settings.trackedE1rmExercises.length > 0
          && <E1rmProgressCard exercises={settings.trackedE1rmExercises} weightUnit={settings.weightUnit}/>}
      </Paper>
    </>
  );
}