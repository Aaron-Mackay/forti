import { z } from 'zod';

export const E1rmHistoryPointSchema = z.object({
  date: z.string(),
  bestE1rm: z.number(),
});
export type E1rmHistoryPoint = z.infer<typeof E1rmHistoryPointSchema>;

export const PreviousWorkoutSummarySchema = z.object({
  completedAt: z.string().nullable(),
  workoutName: z.string(),
  sets: z.array(z.object({
    order: z.number().int(),
    weight: z.number().nullable(),
    reps: z.number().int().nullable(),
    e1rm: z.number().nullable(),
  })),
});
export type PreviousWorkoutSummary = z.infer<typeof PreviousWorkoutSummarySchema>;

export const PreviousExerciseHistorySchema = z.object({
  workouts: z.array(PreviousWorkoutSummarySchema),
});
export type PreviousExerciseHistory = z.infer<typeof PreviousExerciseHistorySchema>;
