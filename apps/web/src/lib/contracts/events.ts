import { z } from 'zod';
import { BlockSubtype, EventType } from '@/generated/prisma/browser';

export const EventResponseSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  customColor: z.string().nullable(),
  eventType: z.enum(EventType),
  blockSubtype: z.enum(BlockSubtype).nullable(),
  recurrenceFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).nullable(),
  recurrenceEnd: z.coerce.date().nullable(),
});
export type EventResponse = z.infer<typeof EventResponseSchema>;
