import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import CustomAppBar, {HEIGHT_EXC_APPBAR} from "@/components/CustomAppBar";
import {Paper, Typography} from "@mui/material";
import DashboardChart from "@/app/user/(dashboard)/DashboardChart";
import DashboardCards from "@/app/user/(dashboard)/DashboardCards";
import {getUserData, getUserDayMetrics, getUserEvents} from "@lib/api";
import {EventType} from "@prisma/client";

export default async function UserPage() {
  const user = await getLoggedInUser()
  const [userDayMetrics, allEvents, userData] = await Promise.all([
    getUserDayMetrics(user.id),
    getUserEvents(user.id),
    getUserData(user.id),
  ])
  const userBlocks = allEvents.filter(ev => ev.eventType === EventType.BlockEvent)

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
        />
        <DashboardChart dayMetrics={userDayMetrics} blocks={userBlocks}/>
      </Paper>
    </>
  );
}