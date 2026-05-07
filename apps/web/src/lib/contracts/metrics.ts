import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/browser';

const JsonValueSchema = z.custom<Prisma.JsonValue>((value) => value !== undefined);

export const MetricResponseSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  date: z.coerce.date(),
  weight: z.number().nullable(),
  steps: z.number().int().nullable(),
  sleepMins: z.number().int().nullable(),
  calories: z.number().int().nullable(),
  protein: z.number().int().nullable(),
  carbs: z.number().int().nullable(),
  fat: z.number().int().nullable(),
  // Custom user-defined metrics: { "<uuid>": { value: Float, target: Float } }
  customMetrics: JsonValueSchema.nullable(),
});
export type MetricResponse = z.infer<typeof MetricResponseSchema>;
