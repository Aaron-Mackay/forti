import { z } from 'zod';
import type { UserPrisma } from '@/types/dataTypes';
import type { Prisma } from '@/generated/prisma/browser';

export const WORKOUT_DATA_SELECT = {
  id: true,
  activePlanId: true,
  plans: {
    orderBy: { order: 'asc' },
    include: {
      weeks: {
        orderBy: { order: 'asc' },
        include: {
          workouts: {
            orderBy: { order: 'asc' },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: {
                  exercise: true,
                  sets: { orderBy: { order: 'asc' } },
                  substitutedFor: true,
                },
              },
            },
          },
        },
      },
    },
  },
  userExerciseNotes: true,
} as const satisfies Prisma.UserSelect;

export type WorkoutDataResponse = Pick<UserPrisma, 'id' | 'activePlanId' | 'plans' | 'userExerciseNotes'>;
export type WorkoutDataPlan = WorkoutDataResponse['plans'][number];
export type WorkoutDataWeek = WorkoutDataPlan['weeks'][number];
export type WorkoutDataWorkout = WorkoutDataWeek['workouts'][number];
export type WorkoutDataExercise = WorkoutDataWorkout['exercises'][number];
export type WorkoutDataSet = WorkoutDataExercise['sets'][number];

const WorkoutDataPlanSchema = z.custom<WorkoutDataPlan>(
  (value) => value !== null && typeof value === 'object',
);
const UserExerciseNoteSchema = z.custom<WorkoutDataResponse['userExerciseNotes'][number]>(
  (value) => value !== null && typeof value === 'object',
);

export const WorkoutDataResponseSchema = z.object({
  id: z.string(),
  activePlanId: z.number().nullable(),
  plans: z.array(WorkoutDataPlanSchema),
  userExerciseNotes: z.array(UserExerciseNoteSchema),
});
