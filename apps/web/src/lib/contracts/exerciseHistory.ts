import { z } from 'zod';

export const E1rmHistoryPointSchema = z.object({
  date: z.string(),
  bestE1rm: z.number(),
  bestSet: z.object({ weight: z.number(), reps: z.number().int() }).nullable(),
});
export type E1rmHistoryPoint = z.infer<typeof E1rmHistoryPointSchema>;

export const E1rmHistoryResponseSchema = z.array(E1rmHistoryPointSchema);
export type E1rmHistoryResponse = z.infer<typeof E1rmHistoryResponseSchema>;

export const PreviousCardioResponseSchema = z.object({
  cardioDuration: z.number().nullable(),
  cardioDistance: z.number().nullable(),
  cardioResistance: z.number().nullable(),
}).nullable();
export type PreviousCardioResponse = z.infer<typeof PreviousCardioResponseSchema>;

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

export const ExcludedSessionSchema = z.object({
  id: z.number().int(),
  dateCompleted: z.string().nullable(),
  workoutName: z.string(),
});
export type ExcludedSession = z.infer<typeof ExcludedSessionSchema>;

export const ExcludedSessionsResponseSchema = z.array(ExcludedSessionSchema);
export type ExcludedSessionsResponse = z.infer<typeof ExcludedSessionsResponseSchema>;
