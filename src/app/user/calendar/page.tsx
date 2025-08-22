import {getUserEvents, getUserDayMetrics} from "@lib/api";
import React from "react";
import {notFound} from "next/navigation";
import Calendar from "./Calendar";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";

const CalendarPage = async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id.toString()
  if (!userId) {
    return notFound()
  }

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
