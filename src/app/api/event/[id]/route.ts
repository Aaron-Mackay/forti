import { NextRequest, NextResponse } from "next/server";
import {deleteUserEvent, updateUserEvent} from "@/lib/api";
import getLoggedInUser from "@lib/getLoggedInUser";
import prisma from "@/lib/prisma";
import {isPrismaNotFound} from "@lib/apiError";

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const eventId = Number((await props.params).id);

  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  try {
    const user = await getLoggedInUser();

    const deletedEvent = await deleteUserEvent(eventId, user.id);
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
  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  try {
    const user = await getLoggedInUser();

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updatedEvent = await updateUserEvent(eventId, body);
    return NextResponse.json(updatedEvent);

  } catch (error) {
    if (isPrismaNotFound(error)) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}