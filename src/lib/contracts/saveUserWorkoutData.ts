import { z } from 'zod';
import { PlanInputSchema } from '@/lib/planSchemas';

export const SaveUserWorkoutDataRequestSchema = z.object({
  id: z.string(),
  activePlanId: z.number().int().positive().nullable().optional(),
  plans: z.array(PlanInputSchema),
});
export type SaveUserWorkoutDataRequest = z.infer<typeof SaveUserWorkoutDataRequestSchema>;

export const SaveUserWorkoutDataSuccessSchema = z.object({
  success: z.literal(true),
});
export type SaveUserWorkoutDataSuccess = z.infer<typeof SaveUserWorkoutDataSuccessSchema>;
