/**
 * Shared Prisma ownership-chain queries.
 *
 * Each helper fetches a resource together with the full parent chain
 * (workoutExercise → workout → week → plan) so callers can verify
 * plan.userId matches the authenticated user without extra round-trips.
 */
import prisma from '@/lib/prisma';

const planOwnerInclude = {
  week: {
    include: {plan: true},
  },
} as const;

const workoutOwnerInclude = {
  workout: {
    include: planOwnerInclude,
  },
} as const;

const workoutExerciseOwnerInclude = {
  workoutExercise: {
    include: workoutOwnerInclude,
  },
} as const;

export function getWorkoutWithOwner(workoutId: number) {
  return prisma.workout.findUnique({
    where: {id: workoutId},
    include: planOwnerInclude,
  });
}

export function getWorkoutExerciseWithOwner(workoutExerciseId: number) {
  return prisma.workoutExercise.findUnique({
    where: {id: workoutExerciseId},
    include: workoutOwnerInclude,
  });
}

export function getSetWithOwner(setId: number) {
  return prisma.exerciseSet.findUnique({
    where: {id: setId},
    include: workoutExerciseOwnerInclude,
  });
}
