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

const IsoTimestampSchema = z.string().datetime({ offset: true });

/**
 * Shape of the stepProgress JSON field on LearningPlanAssignment.
 * Keys are step IDs (as strings). Values track delivery and completion.
 */
export const StepProgressSchema = z.record(
  z.string().regex(/^\d+$/),
  z.object({
    notifiedAt: IsoTimestampSchema.nullable(),
    completedAt: IsoTimestampSchema.nullable(),
  })
);

export type StepProgressMap = z.infer<typeof StepProgressSchema>;

export function parseStepProgress(raw: unknown): StepProgressMap {
  const parsed = StepProgressSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}
