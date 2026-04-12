import {z} from 'zod';
import {BlockSubtype, EventType} from '@/generated/prisma/browser';

export const MetricSchema = z.object({
  userId: z.string(),
  date: z.coerce.date(),
  weight: z.number().optional().nullable(),
  steps: z.number().int().optional().nullable(),
  sleepMins: z.number().int().optional().nullable(),
  calories: z.number().int().optional().nullable(),
  protein: z.number().int().optional().nullable(),
  carbs: z.number().int().optional().nullable(),
  fat: z.number().int().optional().nullable(),
  customMetrics: z.record(z.string(), z.object({
    value: z.number().nullable(),
    target: z.number().nullable(),
  })).optional().nullable(),
});

const TargetDaySchema = z.object({
  caloriesTarget: z.number().int().nullable().optional(),
  proteinTarget:  z.number().int().nullable().optional(),
  carbsTarget:    z.number().int().nullable().optional(),
  fatTarget:      z.number().int().nullable().optional(),
});

export const TargetTemplateSchema = z.object({
  effectiveFrom:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stepsTarget:     z.number().int().nullable().optional(),
  sleepMinsTarget: z.number().int().nullable().optional(),
  // Keys are ISO weekday strings "1"–"7" (coerced to numbers in the route handler)
  days: z.record(z.string(), TargetDaySchema),
  // Optional: write on behalf of another user (coach editing client targets)
  targetUserId:    z.string().optional(),
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
