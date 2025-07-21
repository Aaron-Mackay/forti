import { NextRequest, NextResponse } from "next/server";
import { deleteUserEvent } from "@/lib/api";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const eventId = Number((await props.params).id);

  if (isNaN(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  try {
    const deletedEvent = await deleteUserEvent(eventId);
    return NextResponse.json(deletedEvent);
  } catch (error) {
    // @ts-expect-error error typing
    if (error.code === "P2025") { // Prisma: Record not found
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}