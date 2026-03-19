import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";

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
      include: {
        sets: {orderBy: {order: 'asc'}},
      },
      orderBy: {
        workout: {dateCompleted: 'desc'},
      },
    });

    return NextResponse.json(previousWorkoutExercise?.sets ?? []);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
