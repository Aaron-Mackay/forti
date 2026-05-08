import { z } from 'zod';
import type { UserPrisma } from '@/types/dataTypes';

// Workout screens still operate on the existing editable UserPrisma tree.
// Keeping the schema at this seam lets callers move off the generic user-data
// endpoint before the read model is narrowed further.
export const WorkoutDataResponseSchema = z.custom<UserPrisma>(
  (value) => value !== null && typeof value === 'object',
);
export type WorkoutDataResponse = z.infer<typeof WorkoutDataResponseSchema>;
