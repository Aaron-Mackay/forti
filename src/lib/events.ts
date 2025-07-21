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

export async function deleteEvent(eventId: number) {
  const res = await fetch(`/api/event/${eventId}`, {
    method: "DELETE",
    headers: {"Content-Type": "application/json"},
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateEvent(eventId: number, data: Partial<EventPrisma>) {
  const res = await fetch(`/api/event/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return await res.json();
}