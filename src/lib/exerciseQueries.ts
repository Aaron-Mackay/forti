import prisma from '@/lib/prisma';
import {Prisma} from '@prisma/client';

/**
 * Looks up the dateCompleted for the given workoutId.
 * Returns null if workoutId is undefined or the workout has no completion date.
 */
export async function resolveCurrentWorkoutCompletedAt(
  currentWorkoutId: number | undefined,
): Promise<Date | null> {
  if (currentWorkoutId === undefined) return null;
  const workout = await prisma.workout.findUnique({
    where: {id: currentWorkoutId},
    select: {dateCompleted: true},
  });
  return workout?.dateCompleted ?? null;
}

/**
 * Builds the shared `workout: { ... }` filter used by the three exercise-history
 * routes (previous-sets, previous-cardio, e1rm-history).
 *
 * @param userId              - owner of the plan
 * @param currentWorkoutId    - workout currently being viewed (excluded from results)
 * @param completedAt         - dateCompleted of the current workout (upper bound)
 * @param excludeCurrentId    - whether to explicitly exclude the current workout by id
 *                              (true for previous-sets/cardio; false for e1rm-history)
 */
export function buildPreviousWorkoutFilter(
  userId: string,
  currentWorkoutId: number | undefined,
  completedAt: Date | null,
  excludeCurrentId = true,
): Prisma.WorkoutWhereInput {
  return {
    dateCompleted: {
      not: null,
      ...(completedAt !== null ? {lt: completedAt} : {}),
    },
    ...(excludeCurrentId && currentWorkoutId !== undefined
      ? {id: {not: currentWorkoutId}}
      : {}),
    week: {plan: {userId}},
  };
}
