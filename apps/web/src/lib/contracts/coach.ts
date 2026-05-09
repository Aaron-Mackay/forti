import { z } from 'zod';
import type { CustomMetricDef } from '@/types/settingsTypes';
import {
  CheckInMetricSchema,
  WeekTargetsSchema,
  WeeklyCheckInSchema,
} from './checkIn';
import { TargetTemplateResponseSchema } from './targetTemplates';

export const CoachClientSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable().optional(),
  activePlanId: z.number().int().nullable().optional(),
});
export type CoachClient = z.infer<typeof CoachClientSchema>;

export const CoachClientsResponseSchema = z.object({
  clients: z.array(CoachClientSchema),
});
export type CoachClientsResponse = z.infer<typeof CoachClientsResponseSchema>;

export const CoachCheckInSchema = WeeklyCheckInSchema.extend({
  user: z.object({
    id: z.string(),
    name: z.string(),
  }),
});
export type CoachCheckIn = z.infer<typeof CoachCheckInSchema>;

export const CoachCheckInsResponseSchema = z.object({
  checkIns: z.array(CoachCheckInSchema),
  total: z.number().int().nonnegative(),
  clients: z.array(CoachClientSchema),
});
export type CoachCheckInsResponse = z.infer<typeof CoachCheckInsResponseSchema>;

export const CoachHomeSubmittedCheckInSchema = z.object({
  checkInId: z.number().int(),
  clientId: z.string(),
  clientName: z.string().nullable(),
  weekStartDate: z.coerce.date(),
  completedAt: z.coerce.date(),
});
export type CoachHomeSubmittedCheckIn = z.infer<typeof CoachHomeSubmittedCheckInSchema>;

export const CoachHomeMaintenanceItemSchema = z.object({
  clientId: z.string(),
  clientName: z.string().nullable(),
  planId: z.number().int().nullable(),
  planName: z.string().nullable(),
  kind: z.enum(['block_ending', 'plan_stale', 'no_active_plan']),
  blockEndDate: z.coerce.date().nullable(),
  daysUntilBlockEnd: z.number().int().nullable(),
  lastPlanActivityDate: z.coerce.date().nullable(),
  staleDays: z.number().int().nullable(),
});
export type CoachHomeMaintenanceItem = z.infer<typeof CoachHomeMaintenanceItemSchema>;

export const CoachHomeSummarySchema = z.object({
  clientCount: z.number().int().nonnegative(),
  submittedCheckInCount: z.number().int().nonnegative(),
  maintenanceCount: z.number().int().nonnegative(),
});
export type CoachHomeSummary = z.infer<typeof CoachHomeSummarySchema>;

export const CoachHomeResponseSchema = z.object({
  summary: CoachHomeSummarySchema,
  submittedCheckIns: z.array(CoachHomeSubmittedCheckInSchema),
  planMaintenance: z.array(CoachHomeMaintenanceItemSchema),
});
export type CoachHomeResponse = z.infer<typeof CoachHomeResponseSchema>;

const CoachWorkoutSummarySchema = z.object({
  workoutId: z.number().int(),
  workoutName: z.string(),
  completedSets: z.number().int().nonnegative(),
  plannedSets: z.number().int().nonnegative(),
  muscleDoneSets: z.array(z.object({
    muscle: z.string(),
    doneSets: z.number().nonnegative(),
  })),
});

export const CoachCheckInDetailResponseSchema = z.object({
  checkIn: CoachCheckInSchema,
  currentWeek: z.array(CheckInMetricSchema),
  weekPrior: z.array(CheckInMetricSchema),
  weekTargets: WeekTargetsSchema.nullable(),
  activeTemplate: TargetTemplateResponseSchema.nullable(),
  customMetricDefs: z.custom<CustomMetricDef[]>((value) => Array.isArray(value)),
  workoutSummaries: z.array(CoachWorkoutSummarySchema).optional().default([]),
  activePlanId: z.number().int().nullable(),
});
export type CoachCheckInDetailResponse = z.infer<typeof CoachCheckInDetailResponseSchema>;

// POST /api/coach/activate
export const CoachActivateRequestSchema = z.object({
  active: z.boolean(),
});
export type CoachActivateRequest = z.infer<typeof CoachActivateRequestSchema>;

// POST /api/coach/request
export const CoachRequestCreateSchema = z.object({
  code: z.string().regex(/^(\d{6}|\d{8})$/, 'code must be a 6- or 8-digit number'),
});
export type CoachRequestCreate = z.infer<typeof CoachRequestCreateSchema>;

// PATCH /api/coach/request/[requestId]
export const CoachRequestActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
});
export type CoachRequestAction = z.infer<typeof CoachRequestActionSchema>;

// PUT /api/coach/exercise-description/[exerciseId]
export const CoachExerciseDescriptionRequestSchema = z.object({
  note: z.string(),
  url: z.string().nullable().optional(),
});
export type CoachExerciseDescriptionRequest = z.infer<typeof CoachExerciseDescriptionRequestSchema>;

// PATCH /api/coach/check-ins/[id]/notes
export const CoachCheckInNotesRequestSchema = z.object({
  coachNotes: z.string(),
  coachResponseUrl: z.string().nullable().optional(),
});
export type CoachCheckInNotesRequest = z.infer<typeof CoachCheckInNotesRequestSchema>;

export const CoachCheckInNotesResponseSchema = z.object({
  checkIn: WeeklyCheckInSchema,
});
export type CoachCheckInNotesResponse = z.infer<typeof CoachCheckInNotesResponseSchema>;

export const CoachMutationSuccessResponseSchema = z.object({
  success: z.boolean(),
});
export type CoachMutationSuccessResponse = z.infer<typeof CoachMutationSuccessResponseSchema>;
