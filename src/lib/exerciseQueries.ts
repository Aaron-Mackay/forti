import prisma from '@/lib/prisma';
import {ExerciseCategory, Prisma} from '@prisma/client';

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
/**
 * Finds an exercise scoped to the given user, falling back to the global
 * library, then creating a new user-private exercise if neither exists.
 * Must be called inside a Prisma transaction.
 *
 * Lookup priority:
 *   1. User's own private exercise (createdByUserId === userId)
 *   2. Global exercise (createdByUserId === null)
 *   3. Create new user-private exercise
 */
export async function findOrCreateExercise(
  tx: Prisma.TransactionClient,
  name: string,
  category: ExerciseCategory | null,
  userId: string,
  enrichment?: { primaryMuscles?: string[]; secondaryMuscles?: string[] },
): Promise<{ id: number }> {
  const userOwned = await tx.exercise.findFirst({
    where: { name, category, createdByUserId: userId },
    select: { id: true },
  });
  if (userOwned) return userOwned;

  const globalEx = await tx.exercise.findFirst({
    where: { name, category, createdByUserId: null },
    select: { id: true },
  });
  if (globalEx) return globalEx;

  return tx.exercise.create({
    data: {
      name,
      category,
      createdByUserId: userId,
      primaryMuscles: enrichment?.primaryMuscles ?? [],
      secondaryMuscles: enrichment?.secondaryMuscles ?? [],
    },
    select: { id: true },
  });
}

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
