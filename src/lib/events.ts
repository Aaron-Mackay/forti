import {EventPrisma} from "@/types/dataTypes";
import convertDateToString from "@lib/convertDateToString";

export async function createEvent(event: Omit<EventPrisma, 'id'>) {
  const res = await fetch("/api/event", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      ...event,
      startDate: convertDateToString(event.startDate),
      endDate: convertDateToString(event.endDate),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
