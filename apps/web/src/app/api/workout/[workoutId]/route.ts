import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {getWorkoutWithOwner} from "@lib/queries";
import {errorResponse, forbiddenResponse, notFoundResponse, validationErrorResponse} from "@lib/apiResponses";
import { touchPlanActivity } from '@lib/planActivity';
import { WorkoutUpdateRequestSchema } from '@lib/contracts/workout';

export async function PATCH(req: NextRequest, props: { params: Promise<{ workoutId: string }> }) {
  const params = await props.params;
  const session = await requireSession();

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = WorkoutUpdateRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { notes, dateCompleted } = parsed.data;
  const hasNotes = notes !== undefined;
  const hasDateCompleted = dateCompleted !== undefined;

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

    await touchPlanActivity(workout.week.plan.id);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
