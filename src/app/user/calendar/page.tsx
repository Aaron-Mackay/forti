import {getUserEvents, getUserMetrics} from "@lib/api";
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
  const userMetrics = await getUserMetrics(userId)
  if (!(userEvents && userMetrics)) {
    return notFound()
  }

  return (
    <Calendar events={userEvents} metrics={userMetrics} userId={userId}/>
  )
};

export default CalendarPage;
