import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from '@lib/apiError';
import {buildPreviousWorkoutFilter, resolveCurrentWorkoutCompletedAt} from '@lib/exerciseQueries';

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
    const completedAt = await resolveCurrentWorkoutCompletedAt(currentWorkoutId);

    const workoutExercises = await prisma.workoutExercise.findMany({
      where: {
        exerciseId,
        workout: buildPreviousWorkoutFilter(user.id, currentWorkoutId, completedAt, false),
      },
      select: {
        workout: {select: {dateCompleted: true}},
        sets: {select: {e1rm: true}},
      },
      orderBy: {workout: {dateCompleted: 'asc'}},
    });

    const byDate = new Map<string, number>();
    for (const we of workoutExercises) {
      const date = we.workout.dateCompleted!.toISOString();
      for (const s of we.sets) {
        if (s.e1rm === null) continue;
        const current = byDate.get(date);
        byDate.set(date, current === undefined ? s.e1rm : Math.max(current, s.e1rm));
      }
    }

    const history: E1rmHistoryPoint[] = Array.from(byDate.entries()).map(([date, bestE1rm]) => ({date, bestE1rm}));

    return NextResponse.json(history);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
