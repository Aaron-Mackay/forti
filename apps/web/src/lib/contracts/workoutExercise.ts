import { z } from 'zod';

export const WorkoutExerciseCreateRequestSchema = z.object({
  workoutId: z.number().int().positive(),
  exerciseId: z.number().int().positive(),
  order: z.number().int().nonnegative(),
  // Free-form repRange string — exact format ("10"), range ("5-10"), plus
  // ("5+"), or "AMRAP". Server normalizes via normalizeRepRange and rejects
  // invalid shapes; default applied when missing.
  repRange: z.string().optional(),
  restTime: z.string().optional(),
  setCount: z.number().int().min(1).max(10).optional(),
  requiresRecording: z.boolean().optional(),
});
export type WorkoutExerciseCreateRequest = z.infer<typeof WorkoutExerciseCreateRequestSchema>;

export const WorkoutExerciseUpdateRequestSchema = z.object({
  notes: z.string().optional(),
  cardioDuration: z.number().nullable().optional(),
  cardioDistance: z.number().nullable().optional(),
  cardioResistance: z.number().nullable().optional(),
  exerciseId: z.number().int().positive().optional(),
  targetRpe: z.number().nullable().optional(),
  targetRir: z.number().int().nullable().optional(),
  isBfr: z.boolean().optional(),
  requiresRecording: z.boolean().optional(),
  excludeFromHistory: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});
export type WorkoutExerciseUpdateRequest = z.infer<typeof WorkoutExerciseUpdateRequestSchema>;
