import {EventPrisma} from "@/types/dataTypes";
import convertDateToString from "@lib/convertDateToString";

export async function createEvent(event: Omit<EventPrisma, 'id'>) {
  console.log(event)
  const res = await fetch("/api/event", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      ...event,
      startDate: convertDateToString(event.startDate),
      endDate: convertDateToString(event.endDate),
    }),
  });
  if (!res.ok) throw new Error("Failed to create event");
  return await res.json();
}
