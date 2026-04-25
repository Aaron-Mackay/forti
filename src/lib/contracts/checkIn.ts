import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/browser';

const NullableRatingSchema = z.number().int().min(1).max(5).nullable();
const JsonValueSchema = z.custom<Prisma.JsonValue>((value) => value !== undefined);

export const CheckInPhotoUrlsSchema = z.object({
  frontPhotoUrl: z.string().nullable(),
  backPhotoUrl: z.string().nullable(),
  sidePhotoUrl: z.string().nullable(),
});
export type CheckInPhotoUrls = z.infer<typeof CheckInPhotoUrlsSchema>;

export const WeekTargetsSchema = z.object({
  stepsTarget: z.number().int().nullable(),
  sleepMinsTarget: z.number().int().nullable(),
  caloriesTarget: z.number().int().nullable(),
  proteinTarget: z.number().int().nullable(),
  carbsTarget: z.number().int().nullable(),
  fatTarget: z.number().int().nullable(),
});
export type WeekTargets = z.infer<typeof WeekTargetsSchema>;

export const CheckInMetricSchema = z.object({
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
  customMetrics: z.unknown().nullable(),
});
export type CheckInMetric = z.infer<typeof CheckInMetricSchema>;

export const WeeklyCheckInSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  weekStartDate: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  energyLevel: NullableRatingSchema,
  moodRating: NullableRatingSchema,
  stressLevel: NullableRatingSchema,
  sleepQuality: NullableRatingSchema,
  recoveryRating: NullableRatingSchema,
  adherenceRating: NullableRatingSchema,
  completedWorkouts: z.number().int().nullable(),
  plannedWorkouts: z.number().int().nullable(),
  weekReview: z.string().nullable(),
  coachMessage: z.string().nullable(),
  goalsNextWeek: z.string().nullable(),
  coachNotes: z.string().nullable(),
  coachReviewedAt: z.coerce.date().nullable(),
  coachResponseUrl: z.string().nullable(),
  customResponses: JsonValueSchema.nullable(),
  templateSnapshot: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ...CheckInPhotoUrlsSchema.shape,
}).passthrough();
export type WeeklyCheckInDto = z.infer<typeof WeeklyCheckInSchema>;

export const CheckInHistoryResponseSchema = z.object({
  checkIns: z.array(WeeklyCheckInSchema),
  total: z.number().int().nonnegative(),
});
export type CheckInHistoryResponse = z.infer<typeof CheckInHistoryResponseSchema>;

export const CurrentCheckInResponseSchema = z.object({
  checkIn: WeeklyCheckInSchema,
  currentWeek: z.array(CheckInMetricSchema),
  weekPrior: z.array(CheckInMetricSchema),
  previousPhotos: CheckInPhotoUrlsSchema.nullable(),
  weekTargets: WeekTargetsSchema.nullable(),
  completedWorkoutsCount: z.number().int().nonnegative(),
  plannedWorkoutsCount: z.number().int().nonnegative(),
  activePlanId: z.number().int().nullable(),
  template: z.unknown().nullable(),
});
export type CurrentCheckInResponse = z.infer<typeof CurrentCheckInResponseSchema>;

export const LegacyCheckInRequestSchema = z.object({
  energyLevel: NullableRatingSchema.optional(),
  moodRating: NullableRatingSchema.optional(),
  stressLevel: NullableRatingSchema.optional(),
  sleepQuality: NullableRatingSchema.optional(),
  recoveryRating: NullableRatingSchema.optional(),
  adherenceRating: NullableRatingSchema.optional(),
  completedWorkouts: z.number().int().nullable().optional(),
  plannedWorkouts: z.number().int().nullable().optional(),
  weekReview: z.string().nullable().optional(),
  coachMessage: z.string().nullable().optional(),
  goalsNextWeek: z.string().nullable().optional(),
}).strict();

export const TemplateCheckInRequestSchema = z.object({
  customResponses: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  completedWorkouts: z.number().int().nullable().optional(),
  plannedWorkouts: z.number().int().nullable().optional(),
}).strict();

export const SubmitCheckInRequestSchema = z.union([
  TemplateCheckInRequestSchema,
  LegacyCheckInRequestSchema,
]);
export type SubmitCheckInRequest = z.infer<typeof SubmitCheckInRequestSchema>;

export const SubmitCheckInResponseSchema = z.object({
  checkIn: WeeklyCheckInSchema,
});
export type SubmitCheckInResponse = z.infer<typeof SubmitCheckInResponseSchema>;
