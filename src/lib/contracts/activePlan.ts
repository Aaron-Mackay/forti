import { z } from 'zod';

export const ActivePlanRequestSchema = z.object({
  planId: z.number().int().positive().nullable(),
  targetUserId: z.string().optional(),
});
export type ActivePlanRequest = z.infer<typeof ActivePlanRequestSchema>;

export const ActivePlanSuccessSchema = z.object({
  success: z.literal(true),
  activePlanId: z.number().int().positive().nullable(),
});
export type ActivePlanSuccess = z.infer<typeof ActivePlanSuccessSchema>;
