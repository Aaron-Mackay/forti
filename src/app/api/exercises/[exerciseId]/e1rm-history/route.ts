import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from '@lib/apiError';

export type E1rmHistoryPoint = {date: string; bestE1rm: number};

export async function GET(req: NextRequest, props: {params: Promise<{exerciseId: string}>}) {
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

    const workoutExercises = await prisma.workoutExercise.findMany({
      where: {
        exerciseId,
        workout: {
          dateCompleted: {
            not: null,
            ...(currentWorkoutCompletedAt !== null ? {lt: currentWorkoutCompletedAt} : {}),
          },
          week: {plan: {userId: user.id}},
        },
      },
      select: {
        workout: {select: {dateCompleted: true}},
        sets: {select: {e1rm: true}},
      },
      orderBy: {workout: {dateCompleted: 'asc'}},
    });

    const history: E1rmHistoryPoint[] = workoutExercises
      .map(we => {
        const bestE1rm = we.sets.reduce<number | null>((max, s) => {
          if (s.e1rm === null) return max;
          return max === null ? s.e1rm : Math.max(max, s.e1rm);
        }, null);
        return {date: we.workout.dateCompleted!.toISOString(), bestE1rm};
      })
      .filter((p): p is E1rmHistoryPoint => p.bestE1rm !== null);

    return NextResponse.json(history);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
