/**
 * Shared Prisma ownership-chain queries.
 *
 * Each helper fetches only the minimal ownership chain fields needed
 * to verify plan.userId matches the authenticated user.
 */
import prisma from '@/lib/prisma';

export function getWorkoutWithOwner(workoutId: number) {
  return prisma.workout.findUnique({
    where: {id: workoutId},
    select: {
      id: true,
      week: {
        select: {
          plan: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });
}

export function getWorkoutExerciseWithOwner(workoutExerciseId: number) {
  return prisma.workoutExercise.findUnique({
    where: {id: workoutExerciseId},
    select: {
      id: true,
      exerciseId: true,
      substitutedForId: true,
      workout: {
        select: {
          week: {
            select: {
              plan: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export function getSetWithOwner(setId: number) {
  return prisma.exerciseSet.findUnique({
    where: {id: setId},
    select: {
      id: true,
      reps: true,
      weight: true,
      workoutExercise: {
        select: {
          workout: {
            select: {
              week: {
                select: {
                  plan: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}
