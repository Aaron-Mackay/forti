import {getUserEvents} from "@lib/eventService";
import {getUserMetrics} from "@lib/metricService";
import React from "react";
import {notFound} from "next/navigation";
import Calendar from "./Calendar";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";
import {loadSignalFlag} from "@lib/signal/loadSignalFlag";
import {SignalSurface} from "@/components/signal/SignalSurface";

const CalendarPage = async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id.toString()
  if (!userId) {
    return notFound()
  }

  const [userEvents, userMetrics, signalEnabled] = await Promise.all([
    getUserEvents(userId),
    getUserMetrics(userId),
    loadSignalFlag(),
  ]);
  if (!(userEvents && userMetrics)) {
    return notFound()
  }

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <Calendar events={userEvents} metrics={userMetrics} userId={userId} signalEnabled={signalEnabled}/>
    </SignalSurface>
  )
};

export default CalendarPage;
