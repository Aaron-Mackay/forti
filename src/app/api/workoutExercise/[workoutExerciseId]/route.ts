import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {getWorkoutExerciseWithOwner} from "@lib/queries";
import {errorResponse, forbiddenResponse, notFoundResponse} from "@lib/apiResponses";

export async function DELETE(_req: NextRequest, props: { params: Promise<{ workoutExerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();

  try {
    const workoutExerciseId = Number(params.workoutExerciseId);
    const workoutExercise = await getWorkoutExerciseWithOwner(workoutExerciseId);

    if (!workoutExercise) return notFoundResponse('WorkoutExercise');

    if (workoutExercise.workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    await prisma.workoutExercise.delete({where: {id: workoutExerciseId}});

    return new NextResponse(null, {status: 204});
  } catch (err: unknown) {
    console.error(err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ workoutExerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();
  const body = await req.json();
  const {notes, cardioDuration, cardioDistance, cardioResistance, exerciseId, targetRpe, targetRir, isBfr} = body;

  if ('notes' in body && typeof notes !== 'string') {
    return errorResponse('notes must be a string', 400);
  }

  if ('isBfr' in body && typeof isBfr !== 'boolean') {
    return errorResponse('isBfr must be a boolean', 400);
  }

  if ('exerciseId' in body && typeof exerciseId !== 'number') {
    return errorResponse('exerciseId must be a number', 400);
  }

  try {
    const workoutExerciseId = Number(params.workoutExerciseId);
    const workoutExercise = await getWorkoutExerciseWithOwner(workoutExerciseId);

    if (!workoutExercise) return notFoundResponse('WorkoutExercise');

    if (workoutExercise.workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    const updateData: {
      notes?: string;
      cardioDuration?: number | null;
      cardioDistance?: number | null;
      cardioResistance?: number | null;
      targetRpe?: number | null;
      targetRir?: number | null;
      exerciseId?: number;
      substitutedForId?: number | null;
      isBfr?: boolean;
    } = {};

    if ('notes' in body) updateData.notes = notes;
    if ('cardioDuration' in body) updateData.cardioDuration = cardioDuration ?? null;
    if ('cardioDistance' in body) updateData.cardioDistance = cardioDistance ?? null;
    if ('cardioResistance' in body) updateData.cardioResistance = cardioResistance ?? null;
    if ('targetRpe' in body) {
      updateData.targetRpe = typeof targetRpe === 'number' ? targetRpe : null;
      if (updateData.targetRpe !== null) updateData.targetRir = null; // mutually exclusive
    }
    if ('targetRir' in body) {
      updateData.targetRir = typeof targetRir === 'number' ? targetRir : null;
      if (updateData.targetRir !== null) updateData.targetRpe = null; // mutually exclusive
    }

    if ('isBfr' in body) updateData.isBfr = isBfr;

    if ('exerciseId' in body && exerciseId !== workoutExercise.exerciseId) {
      const exercise = await prisma.exercise.findUnique({where: {id: exerciseId}});
      if (!exercise) return notFoundResponse('Exercise');
      updateData.exerciseId = exerciseId;
      if (workoutExercise.substitutedForId !== null && exerciseId === workoutExercise.substitutedForId) {
        // Reverting to the original exercise — clear the substitution marker
        updateData.substitutedForId = null;
      } else if (!workoutExercise.substitutedForId) {
        // First substitution — record the original exercise
        updateData.substitutedForId = workoutExercise.exerciseId;
      }
    }

    const updated = await prisma.workoutExercise.update({
      where: {id: workoutExerciseId},
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
