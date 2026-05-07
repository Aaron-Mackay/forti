import { z } from 'zod';
import { BUILTIN_METRIC_KEYS } from '@/types/metricTypes';

export const MetricHistoryQuerySchema = z.object({
  metric:    z.enum(BUILTIN_METRIC_KEYS as [string, ...string[]]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  clientId:  z.string().optional(),
});

export const MetricHistoryPointSchema = z.object({
  date:  z.string(),
  value: z.number().nullable(),
});
export type MetricHistoryPoint = z.infer<typeof MetricHistoryPointSchema>;

export const MetricHistoryResponseSchema = z.object({
  points: z.array(MetricHistoryPointSchema),
});
export type MetricHistoryResponse = z.infer<typeof MetricHistoryResponseSchema>;
