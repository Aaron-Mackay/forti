import { z } from 'zod';

export const LearningPlanCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
});

export const LearningPlanUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
});

export const LearningPlanStepCreateSchema = z.object({
  dayOffset: z.number().int().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  assetId: z.string().optional().nullable(),
});

export const LearningPlanStepUpdateSchema = z.object({
  dayOffset: z.number().int().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
  assetId: z.string().optional().nullable(),
});

export const LearningPlanStepReorderSchema = z.object({
  stepIds: z.array(z.number().int()),
});

export const LearningPlanAssignSchema = z.object({
  clientId: z.string(),
  startDate: z.coerce.date(),
});

/**
 * Shape of the stepProgress JSON field on LearningPlanAssignment.
 * Keys are step IDs (as strings). Values track delivery and completion.
 */
export const StepProgressSchema = z.record(
  z.string(),
  z.object({
    notifiedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
  })
);

export type StepProgressMap = z.infer<typeof StepProgressSchema>;
