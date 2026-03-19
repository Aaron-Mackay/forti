import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {getWorkoutWithOwner} from "@lib/queries";
import {errorResponse, forbiddenResponse, notFoundResponse} from "@lib/apiResponses";

export async function PATCH(req: NextRequest, props: { params: Promise<{ workoutId: string }> }) {
  const params = await props.params;
  const session = await requireSession();
  const body = await req.json();
  const { notes, dateCompleted } = body;

  const hasNotes = 'notes' in body;
  const hasDateCompleted = 'dateCompleted' in body;

  if (!hasNotes && !hasDateCompleted) {
    return errorResponse('At least one of notes or dateCompleted must be provided', 400);
  }

  if (hasNotes && typeof notes !== 'string') {
    return errorResponse('notes must be a string', 400);
  }

  if (hasDateCompleted && dateCompleted !== null && typeof dateCompleted !== 'string') {
    return errorResponse('dateCompleted must be an ISO string or null', 400);
  }

  try {
    const workoutId = Number(params.workoutId);
    const workout = await getWorkoutWithOwner(workoutId);

    if (!workout) return notFoundResponse('Workout');

    if (workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    const updateData: { notes?: string; dateCompleted?: Date | null } = {};
    if (hasNotes) updateData.notes = notes;
    if (hasDateCompleted) updateData.dateCompleted = dateCompleted ? new Date(dateCompleted) : null;

    const updated = await prisma.workout.update({
      where: {id: workoutId},
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
