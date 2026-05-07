import { z } from 'zod';
import { PlanPostSchema } from '@/lib/planSchemas';

export const PlanUploadRequestSchema = PlanPostSchema;
export type PlanUploadRequest = z.infer<typeof PlanUploadRequestSchema>;

export const PlanUploadSuccessSchema = z.object({
  success: z.literal(true),
  planId: z.number().int().positive(),
});
export type PlanUploadSuccess = z.infer<typeof PlanUploadSuccessSchema>;
