import {getUserEvents, getUserDayMetrics} from "@lib/api";
import React from "react";
import {notFound} from "next/navigation";
import Calendar from "./Calendar";

const CalendarPage = async ({params}: { params: Promise<{ userId: string }> }) => {
  const userId = (await params).userId
  const userEvents = await getUserEvents(userId)
  const userDayMetrics = await getUserDayMetrics(userId)
  if (!(userEvents && userDayMetrics)) {
    return notFound()
  }

  return (
    <Calendar events={userEvents} dayMetrics={userDayMetrics} userId={userId}/>
  )
};

export default CalendarPage;
