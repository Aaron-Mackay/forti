import { NextRequest, NextResponse } from "next/server";
import {deleteUserEvent, updateUserEvent} from "@/lib/api";
import {requireSession} from "@lib/requireSession";
import prisma from "@/lib/prisma";
import {isPrismaNotFound} from "@lib/apiError";
import {z} from "zod";
import {BlockSubtype, EventType} from "@prisma/client";

const EventPatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  customColor: z.string().optional().nullable(),
  eventType: z.enum(EventType).optional(),
  blockSubtype: z.enum(BlockSubtype).optional().nullable(),
  recurrenceFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
  recurrenceEnd: z.coerce.date().optional().nullable(),
}).strict();

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const eventId = Number((await props.params).id);
  const session = await requireSession();

  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  try {
    const deletedEvent = await deleteUserEvent(eventId, session.user.id);
    return NextResponse.json(deletedEvent);
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const eventId = Number((await props.params).id);
  const session = await requireSession();

  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json();
    const parsed = EventPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {error: "Invalid request", issues: parsed.error.flatten()},
        {status: 400}
      );
    }
    const updatedEvent = await updateUserEvent(eventId, parsed.data);
    return NextResponse.json(updatedEvent);

  } catch (error) {
    if (isPrismaNotFound(error)) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}