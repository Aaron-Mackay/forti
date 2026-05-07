import { z } from 'zod';

export const WeightUnitSchema = z.enum(['kg', 'lbs']);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

export const BodyweightUnitSchema = z.enum(['kg', 'lb', 'st']);
export type BodyweightUnit = z.infer<typeof BodyweightUnitSchema>;

export const ExerciseUnitOverrideSchema = z.enum(['kg', 'lbs', 'none']);
export type ExerciseUnitOverride = z.infer<typeof ExerciseUnitOverrideSchema>;

export const CustomMetricDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  target: z.number().nullable().optional(),
});
export type CustomMetricDef = z.infer<typeof CustomMetricDefSchema>;

export const TrackedE1rmExerciseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});
export type TrackedE1rmExercise = z.infer<typeof TrackedE1rmExerciseSchema>;

export const UserSettingsSchema = z.object({
  showNextWorkout: z.boolean(),
  showTodaysMetrics: z.boolean(),
  showWeeklyTraining: z.boolean(),
  showActiveBlock: z.boolean(),
  showUpcomingEvents: z.boolean(),
  showMetricsChart: z.boolean(),
  showStopwatch: z.boolean(),
  coachModeActive: z.boolean(),
  showSupplements: z.boolean(),
  checkInDay: z.number().int().min(0).max(6),
  customMetrics: z.array(CustomMetricDefSchema),
  onboardingDismissed: z.boolean(),
  onboardingSeenWelcome: z.boolean(),
  weightUnit: WeightUnitSchema,
  bodyweightUnit: BodyweightUnitSchema,
  exerciseUnitOverrides: z.record(z.string(), ExerciseUnitOverrideSchema),
  trackedE1rmExercises: z.array(TrackedE1rmExerciseSchema),
  showE1rmProgress: z.boolean(),
  registrationComplete: z.boolean(),
  effortMetric: z.enum(['none', 'rpe', 'rir']),
  showWarmupSuggestions: z.boolean(),
  showPlateCalculator: z.boolean(),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserSettingsResponseSchema = z.object({
  settings: UserSettingsSchema,
});
export type UserSettingsResponse = z.infer<typeof UserSettingsResponseSchema>;

// PATCH /api/user/settings intentionally remains permissive so individual keys
// can evolve without invalidating consumers that only need a partial update.
export const UserSettingsUpdateRequestSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
});
export type UserSettingsUpdateRequest = z.infer<typeof UserSettingsUpdateRequestSchema>;
