import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from '@lib/getLoggedInUser';
import {extractErrorMessage} from "@lib/apiError";
import {getWorkoutExerciseWithOwner} from "@lib/queries";

export async function DELETE(_req: NextRequest, props: { params: Promise<{ workoutExerciseId: string }> }) {
  const params = await props.params;

  try {
    const workoutExerciseId = Number(params.workoutExerciseId);
    const workoutExercise = await getWorkoutExerciseWithOwner(workoutExerciseId);

    if (!workoutExercise) {
      return NextResponse.json({error: 'WorkoutExercise not found'}, {status: 404});
    }

    const user = await getLoggedInUser();
    if (workoutExercise.workout.week.plan.userId !== user.id) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    await prisma.workoutExercise.delete({where: {id: workoutExerciseId}});

    return new NextResponse(null, {status: 204});
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ workoutExerciseId: string }> }) {
  const params = await props.params;
  const body = await req.json();
  const {notes, cardioDuration, cardioDistance, cardioResistance, exerciseId} = body;

  if ('notes' in body && typeof notes !== 'string') {
    return NextResponse.json({error: 'notes must be a string'}, {status: 400});
  }

  if ('exerciseId' in body && typeof exerciseId !== 'number') {
    return NextResponse.json({error: 'exerciseId must be a number'}, {status: 400});
  }

  try {
    const workoutExerciseId = Number(params.workoutExerciseId);
    const workoutExercise = await getWorkoutExerciseWithOwner(workoutExerciseId);

    if (!workoutExercise) {
      return NextResponse.json({error: 'WorkoutExercise not found'}, {status: 404});
    }

    const user = await getLoggedInUser();
    if (workoutExercise.workout.week.plan.userId !== user.id) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    const updateData: {
      notes?: string;
      cardioDuration?: number | null;
      cardioDistance?: number | null;
      cardioResistance?: number | null;
      exerciseId?: number;
      substitutedForId?: number;
    } = {};

    if ('notes' in body) updateData.notes = notes;
    if ('cardioDuration' in body) updateData.cardioDuration = cardioDuration ?? null;
    if ('cardioDistance' in body) updateData.cardioDistance = cardioDistance ?? null;
    if ('cardioResistance' in body) updateData.cardioResistance = cardioResistance ?? null;

    if ('exerciseId' in body) {
      const exercise = await prisma.exercise.findUnique({where: {id: exerciseId}});
      if (!exercise) {
        return NextResponse.json({error: 'Exercise not found'}, {status: 404});
      }
      updateData.exerciseId = exerciseId;
      // Record the original exercise if not already substituted
      if (!workoutExercise.substitutedForId) {
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
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
