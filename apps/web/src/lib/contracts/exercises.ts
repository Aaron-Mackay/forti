import { z } from 'zod';
import { ExerciseCategory } from '@/generated/prisma/browser';
import type { Exercise } from '@/generated/prisma/browser';
import { EXERCISE_EQUIPMENT, EXERCISE_MUSCLES } from '@/types/dataTypes';

const optionalTrimmedSearch = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).max(100).optional(),
);

export const ExerciseListQuerySchema = z.object({
  search: optionalTrimmedSearch,
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(['name', 'recent']).optional(),
});
export type ExerciseListQuery = z.infer<typeof ExerciseListQuerySchema>;

export const ExerciseSchema: z.ZodType<Exercise> = z.object({
  id: z.number().int(),
  name: z.string(),
  category: z.enum(ExerciseCategory).nullable(),
  description: z.string().nullable(),
  equipment: z.array(z.enum(EXERCISE_EQUIPMENT)),
  primaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)),
  secondaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)),
  createdByUserId: z.string().nullable(),
});

export const ExerciseListResponseSchema = z.array(ExerciseSchema);
export type ExerciseListResponse = z.infer<typeof ExerciseListResponseSchema>;

export const CreateExerciseRequestSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  category: z.enum(ExerciseCategory).optional().nullable(),
  description: z.string().optional().nullable(),
  equipment: z.array(z.enum(EXERCISE_EQUIPMENT)).min(1, 'At least one piece of equipment is required'),
  primaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)).min(1, 'At least one primary muscle is required'),
  secondaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)).default([]),
});
export type CreateExerciseRequest = z.infer<typeof CreateExerciseRequestSchema>;
