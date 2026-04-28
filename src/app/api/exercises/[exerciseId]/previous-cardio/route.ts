import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {buildPreviousWorkoutFilter, resolveCurrentWorkoutCompletedAt} from '@lib/exerciseQueries';
import { selectPreviousWorkoutCandidate } from '@lib/previousWorkoutSelector';

export async function GET(req: NextRequest, props: { params: Promise<{ exerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();
  const exerciseId = Number(params.exerciseId);
  const currentWorkoutId = Number(req.nextUrl.searchParams.get('currentWorkoutId')) || undefined;

  if (isNaN(exerciseId) || exerciseId <= 0) {
    return NextResponse.json({error: 'Invalid exerciseId'}, {status: 400});
  }

  try {
    const user = session.user;
    const completedAt = await resolveCurrentWorkoutCompletedAt(currentWorkoutId);

    const previousWorkoutExercises = await prisma.workoutExercise.findMany({
      where: {
        exerciseId,
        OR: [
          {cardioDuration: {not: null}},
          {cardioDistance: {not: null}},
          {cardioResistance: {not: null}},
        ],
        workout: buildPreviousWorkoutFilter(user.id, currentWorkoutId, completedAt),
      },
      select: {
        workoutId: true,
        workout: {
          select: { dateCompleted: true },
        },
        cardioDuration: true,
        cardioDistance: true,
        cardioResistance: true,
      },
      orderBy: {
        workout: {dateCompleted: 'desc'},
      },
    });

    const selectedExercise = selectPreviousWorkoutCandidate(
      previousWorkoutExercises.map((entry) => ({
        sortValue: entry.workout.dateCompleted?.getTime() ?? Number.NEGATIVE_INFINITY,
        workoutId: entry.workoutId,
        hasTrackedData:
          entry.cardioDuration != null ||
          entry.cardioDistance != null ||
          entry.cardioResistance != null,
        value: entry,
      })),
      {
        currentSortValue: completedAt?.getTime() ?? Number.POSITIVE_INFINITY,
        currentWorkoutId,
        requireTrackedData: true,
      },
    )

    if (!selectedExercise) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      cardioDuration: selectedExercise.cardioDuration,
      cardioDistance: selectedExercise.cardioDistance,
      cardioResistance: selectedExercise.cardioResistance,
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
