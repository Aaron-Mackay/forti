import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import CustomAppBar, {HEIGHT_EXC_APPBAR} from "@/components/CustomAppBar";
import {Paper, Typography} from "@mui/material";
import DashboardChart from "@/app/user/(dashboard)/DashboardChart";
import {getUserDayMetrics, getUserEvents} from "@lib/api";
import {EventType} from "@prisma/client";

export default async function UserPage() {
  const user = await getLoggedInUser()
  const userDayMetrics = await getUserDayMetrics(user.id)
  const userBlocks =
    (await getUserEvents(user.id)).filter(ev => ev.eventType === EventType.BlockEvent)

  return (
    <>
      <CustomAppBar title={"Dashboard"}/>
      <Paper sx={{px: 2, height: HEIGHT_EXC_APPBAR, display: 'flex', flexDirection: 'column'}}>
        <Typography variant={'h4'} sx={{paddingTop: 2}}>{`Welcome ${user.name?.split(' ')[0]}`}</Typography>
        <DashboardChart dayMetrics={userDayMetrics} blocks={userBlocks}/>
      </Paper>
    </>
  );
}