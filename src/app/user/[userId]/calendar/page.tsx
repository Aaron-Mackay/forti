import {getUserEvents, getUserDayMetrics} from "@lib/api";
import React from "react";
import {notFound} from "next/navigation";
import Calendar from "./Calendar";

const CalendarPage = async ({params}: { params: Promise<{ userId: string }> }) => {
  const userEvents = await getUserEvents((await params).userId)
  const userDayMetrics = await getUserDayMetrics((await params).userId)
  if (!(userEvents && userDayMetrics)) {
    return notFound()
  }

  return (
    <Calendar events={userEvents} dayMetrics={userDayMetrics}/>
  )
};

export default CalendarPage;
