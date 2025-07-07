import {getUserEvents} from "@lib/api";
import React from "react";
import {notFound} from "next/navigation";
import Calendar from "./Calendar";

const CalendarPage = async ({params}: { params: Promise<{ userId: string }> }) => {
  const userEvents = await getUserEvents((await params).userId)
  if (!userEvents) {
    return notFound()
  }

  return (
    <Calendar events={userEvents}/>
  )
};

export default CalendarPage;
