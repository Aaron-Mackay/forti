import { z } from 'zod';

// PUT /api/exerciseNote/[exerciseId]
export const ExerciseNoteUpdateRequestSchema = z.object({
  note: z.string(),
});
export type ExerciseNoteUpdateRequest = z.infer<typeof ExerciseNoteUpdateRequestSchema>;
