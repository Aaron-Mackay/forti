import { z } from 'zod';
import { BlockSubtype, EventType } from '@/generated/prisma/browser';

export const RecurrenceFrequency = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type RecurrenceFrequency = typeof RecurrenceFrequency[number];

export const EventSchema = z.object({
  userId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  name: z.string(),
  eventType: z.enum(EventType),
  description: z.string().optional().nullable(),
  customColor: z.string().optional().nullable(),
  blockSubtype: z.enum(BlockSubtype).optional().nullable(),
  recurrenceFrequency: z.enum(RecurrenceFrequency).optional().nullable(),
  recurrenceEnd: z.coerce.date().optional().nullable(),
  resolveBlockOverlaps: z.boolean().optional(),
});

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
