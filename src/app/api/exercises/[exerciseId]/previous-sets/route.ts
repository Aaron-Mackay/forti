import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {buildPreviousWorkoutFilter, resolveCurrentWorkoutCompletedAt} from '@lib/exerciseQueries';
import {computeE1rm} from '@/lib/e1rm';

export type PreviousWorkoutSummary = {
  completedAt: string | null;
  sets: Array<{
    order: number;
    weight: number | null;
    reps: number | null;
    e1rm: number | null;
  }>;
};

export type PreviousExerciseHistory = {
  workouts: PreviousWorkoutSummary[];
};

export async function GET(req: NextRequest, props: { params: Promise<{ exerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();
  const exerciseId = Number(params.exerciseId);
  const currentWorkoutId = Number(req.nextUrl.searchParams.get('currentWorkoutId')) || undefined;

  if (isNaN(exerciseId) || exerciseId <= 0) {
    return NextResponse.json({error: 'Invalid exerciseId'}, {status: 400});
  }
  if (currentWorkoutId === undefined) {
    return NextResponse.json({error: 'Missing current workout context'}, {status: 400});
  }

  try {
    const user = session.user;
    const completedAt = await resolveCurrentWorkoutCompletedAt(currentWorkoutId);

    const previousWorkouts = await prisma.workout.findMany({
      where: {
        ...buildPreviousWorkoutFilter(user.id, currentWorkoutId, completedAt),
        exercises: {some: {exerciseId}},
      },
      select: {
        dateCompleted: true,
        exercises: {
          where: {exerciseId},
          orderBy: {order: 'asc'},
          select: {
            sets: {
              where: {isDropSet: false},
              orderBy: {order: 'asc'},
              select: {order: true, weight: true, reps: true, e1rm: true},
            },
          },
        },
      },
      orderBy: {dateCompleted: 'desc'},
      take: 3,
    });

    const history: PreviousExerciseHistory = {
      workouts: previousWorkouts.flatMap(workout => {
        if (!workout.dateCompleted) return [];
        const sets = workout.exercises
          .flatMap(ex => ex.sets)
          .map((set, i) => ({
            order: i + 1,
            weight: set.weight,
            reps: set.reps,
            e1rm: set.e1rm ?? computeE1rm(set.weight, set.reps),
          }));
        if (sets.every(s => s.reps == null)) return [];
        return [{completedAt: workout.dateCompleted.toISOString(), sets}];
      }),
    };

    return NextResponse.json(history);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
