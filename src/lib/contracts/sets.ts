import { z } from 'zod';

const nullableNumber = z.number().nullable();
const nullableInt = z.number().int().nullable();

export const SetUpdateRequestSchema = z.object({
  reps: nullableInt.optional(),
  weight: nullableNumber.optional(),
  rpe: nullableNumber.optional(),
  rir: nullableInt.optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one of reps, weight, rpe, rir must be provided',
});
export type SetUpdateRequest = z.infer<typeof SetUpdateRequestSchema>;

// POST /api/sets — append a new set to a workoutExercise
export const SetCreateRequestSchema = z.object({
  workoutExerciseId: z.number().int().positive(),
  weight: z.number().nullable().optional(),
  isDropSet: z.boolean().optional(),
  parentSetId: z.number().int().positive().nullable().optional(),
});
export type SetCreateRequest = z.infer<typeof SetCreateRequestSchema>;
