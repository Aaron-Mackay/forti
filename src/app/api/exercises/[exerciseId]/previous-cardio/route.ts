import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from '@lib/getLoggedInUser';
import {extractErrorMessage} from "@lib/apiError";

export async function GET(req: NextRequest, props: { params: Promise<{ exerciseId: string }> }) {
  const params = await props.params;
  const exerciseId = Number(params.exerciseId);
  const currentWorkoutId = Number(req.nextUrl.searchParams.get('currentWorkoutId')) || undefined;

  if (isNaN(exerciseId) || exerciseId <= 0) {
    return NextResponse.json({error: 'Invalid exerciseId'}, {status: 400});
  }

  try {
    const user = await getLoggedInUser();

    let currentWorkoutCompletedAt: Date | null = null;
    if (currentWorkoutId !== undefined) {
      const currentWorkout = await prisma.workout.findUnique({
        where: {id: currentWorkoutId},
        select: {dateCompleted: true},
      });
      currentWorkoutCompletedAt = currentWorkout?.dateCompleted ?? null;
    }

    const previousWorkoutExercise = await prisma.workoutExercise.findFirst({
      where: {
        exerciseId,
        OR: [
          {cardioDuration: {not: null}},
          {cardioDistance: {not: null}},
          {cardioResistance: {not: null}},
        ],
        workout: {
          dateCompleted: {
            not: null,
            ...(currentWorkoutCompletedAt !== null ? {lt: currentWorkoutCompletedAt} : {}),
          },
          ...(currentWorkoutId !== undefined ? {id: {not: currentWorkoutId}} : {}),
          week: {
            plan: {userId: user.id},
          },
        },
      },
      select: {
        cardioDuration: true,
        cardioDistance: true,
        cardioResistance: true,
      },
      orderBy: {
        workout: {dateCompleted: 'desc'},
      },
    });

    return NextResponse.json(previousWorkoutExercise ?? null);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
