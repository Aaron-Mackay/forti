import { z } from 'zod';

// POST /api/coach/activate
export const CoachActivateRequestSchema = z.object({
  active: z.boolean(),
});
export type CoachActivateRequest = z.infer<typeof CoachActivateRequestSchema>;

// POST /api/coach/request
export const CoachRequestCreateSchema = z.object({
  code: z.string().regex(/^(\d{6}|\d{8})$/, 'code must be a 6- or 8-digit number'),
});
export type CoachRequestCreate = z.infer<typeof CoachRequestCreateSchema>;

// PATCH /api/coach/request/[requestId]
export const CoachRequestActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
});
export type CoachRequestAction = z.infer<typeof CoachRequestActionSchema>;

// PUT /api/coach/exercise-description/[exerciseId]
export const CoachExerciseDescriptionRequestSchema = z.object({
  note: z.string(),
  url: z.string().nullable().optional(),
});
export type CoachExerciseDescriptionRequest = z.infer<typeof CoachExerciseDescriptionRequestSchema>;

// PATCH /api/coach/check-ins/[id]/notes
export const CoachCheckInNotesRequestSchema = z.object({
  coachNotes: z.string(),
  coachResponseUrl: z.string().nullable().optional(),
});
export type CoachCheckInNotesRequest = z.infer<typeof CoachCheckInNotesRequestSchema>;
