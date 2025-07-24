import {EventPrisma} from "@/types/dataTypes";
import {convertDateStringToDate, convertDateToDateString} from "@lib/dateUtils";

export async function createEvent(event: Omit<EventPrisma, 'id'>): Promise<EventPrisma> {
  const res = await fetch("/api/event", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      ...event,
      startDate: convertDateToDateString(event.startDate),
      endDate: convertDateToDateString(event.endDate),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const createdEvent = await res.json()
  return {
    ...createdEvent,
    startDate: convertDateStringToDate(createdEvent.startDate),
    endDate: convertDateStringToDate(createdEvent.endDate),
  };
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