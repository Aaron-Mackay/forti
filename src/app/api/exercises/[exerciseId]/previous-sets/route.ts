import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {buildPreviousWorkoutFilter, resolveCurrentWorkoutCompletedAt} from '@lib/exerciseQueries';

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

    const previousWorkoutExercise = await prisma.workoutExercise.findFirst({
      where: {
        exerciseId,
        workout: buildPreviousWorkoutFilter(user.id, currentWorkoutId, completedAt),
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
