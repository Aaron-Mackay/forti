import { z } from 'zod';
import type { ActivePlanTree, ActivePlanWithStats } from '@lib/userService';

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

// GET /api/plan/active response. The deeply-nested `activePlan` is typed via
// Prisma payload helpers — the schema validates wrapper fields and uses
// z.custom<>() to preserve typing on the tree.
export const ActivePlanGetResponseSchema = z.object({
  activePlan: z.custom<ActivePlanTree | null>((v) => v === null || typeof v === 'object'),
  activePlanId: z.number().int().positive().nullable(),
  hasAnyPlan: z.boolean(),
  hasAnyCompletedWorkout: z.boolean(),
  weeklyTrainingCount: z.number().int().nonnegative(),
});
export type ActivePlanGetResponse = ActivePlanWithStats;
