import {z} from 'zod';
import {BlockSubtype, EventType} from '@prisma/client';

export const DayMetricSchema = z.object({
  userId: z.string(),
  date: z.coerce.date(),
  weight: z.number().optional().nullable(),
  steps: z.number().int().optional().nullable(),
  sleepMins: z.number().int().optional().nullable(),
  calories: z.number().int().optional().nullable(),
  protein: z.number().int().optional().nullable(),
  carbs: z.number().int().optional().nullable(),
  fat: z.number().int().optional().nullable(),
  caloriesTarget: z.number().int().optional().nullable(),
  proteinTarget: z.number().int().optional().nullable(),
  carbsTarget: z.number().int().optional().nullable(),
  fatTarget: z.number().int().optional().nullable(),
  stepsTarget: z.number().int().optional().nullable(),
  sleepMinsTarget: z.number().int().optional().nullable(),
  customMetrics: z.record(z.string(), z.object({
    value: z.number().nullable(),
    target: z.number().nullable(),
  })).optional().nullable(),
});

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
});
