import { z } from 'zod';
import type { UserExerciseNote } from '@/generated/prisma/browser';

// PUT /api/exerciseNote/[exerciseId]
export const ExerciseNoteUpdateRequestSchema = z.object({
  note: z.string(),
});
export type ExerciseNoteUpdateRequest = z.infer<typeof ExerciseNoteUpdateRequestSchema>;

export const ExerciseNoteResponseSchema: z.ZodType<UserExerciseNote> = z.object({
  id: z.number().int(),
  userId: z.string(),
  exerciseId: z.number().int(),
  note: z.string(),
});
export type ExerciseNoteResponse = z.infer<typeof ExerciseNoteResponseSchema>;
