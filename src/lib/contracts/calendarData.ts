import { z } from 'zod';
import { EventResponseSchema } from './events';
import { MetricResponseSchema } from './metrics';

export const CalendarDataResponseSchema = z.object({
  events: z.array(EventResponseSchema),
  metrics: z.array(MetricResponseSchema),
});
export type CalendarDataResponse = z.infer<typeof CalendarDataResponseSchema>;
