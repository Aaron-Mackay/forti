import { z } from 'zod';

// PATCH /api/workout/[workoutId]
export const WorkoutUpdateRequestSchema = z.object({
  notes: z.string().optional(),
  dateCompleted: z.string().datetime().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one of notes or dateCompleted must be provided',
});
export type WorkoutUpdateRequest = z.infer<typeof WorkoutUpdateRequestSchema>;
