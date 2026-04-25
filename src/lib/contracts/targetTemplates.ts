import { z } from 'zod';

export const TargetTemplateDaySchema = z.object({
  caloriesTarget: z.number().int().nullable(),
  proteinTarget: z.number().int().nullable(),
  carbsTarget: z.number().int().nullable(),
  fatTarget: z.number().int().nullable(),
});

export const TargetTemplateRequestSchema = z.object({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stepsTarget: z.number().int().nullable(),
  sleepMinsTarget: z.number().int().nullable(),
  targetUserId: z.string().optional(),
  days: z.record(z.string(), TargetTemplateDaySchema),
});
export type TargetTemplateRequest = z.infer<typeof TargetTemplateRequestSchema>;

export const TargetTemplateResponseSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  effectiveFrom: z.coerce.date(),
  stepsTarget: z.number().int().nullable(),
  sleepMinsTarget: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  days: z.array(z.object({
    id: z.number().int(),
    targetTemplateId: z.number().int(),
    dayOfWeek: z.number().int().min(1).max(7),
    caloriesTarget: z.number().int().nullable(),
    proteinTarget: z.number().int().nullable(),
    carbsTarget: z.number().int().nullable(),
    fatTarget: z.number().int().nullable(),
  })),
});
export type TargetTemplateResponse = z.infer<typeof TargetTemplateResponseSchema>;

export const GetTargetTemplateResponseSchema = z.object({
  template: TargetTemplateResponseSchema.nullable(),
});
export type GetTargetTemplateResponse = z.infer<typeof GetTargetTemplateResponseSchema>;
