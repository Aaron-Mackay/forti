import { z } from 'zod';

export const SessionTypeSchema = z.enum(['workout', 'cardio']);
export type SessionType = z.infer<typeof SessionTypeSchema>;

export const SessionStatusSchema = z.enum(['planned', 'completed']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const CardioPayloadSchema = z.object({
  activityType: z.string().trim().min(1, 'activityType is required'),
  durationSec: z.number().int().positive('durationSec must be > 0'),
  distanceM: z.number().int().positive().optional(),
  avgPace: z.number().positive().optional(),
  avgHr: z.number().int().positive().optional(),
  calories: z.number().int().nonnegative().optional(),
  notes: z.string().trim().max(2_000).optional(),
});
export type CardioPayload = z.infer<typeof CardioPayloadSchema>;

export const SessionCreateRequestSchema = z.object({
  sessionType: SessionTypeSchema,
  status: SessionStatusSchema.optional().default('completed'),
  performedAt: z.string().datetime().optional(),
  workoutId: z.number().int().positive().optional(),
  cardio: CardioPayloadSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.sessionType === 'cardio' && !value.cardio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cardio'],
      message: 'cardio payload is required when sessionType is cardio',
    });
  }

  if (value.sessionType === 'workout' && !value.workoutId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['workoutId'],
      message: 'workoutId is required when sessionType is workout',
    });
  }
});
export type SessionCreateRequest = z.infer<typeof SessionCreateRequestSchema>;

export const SessionListQuerySchema = z.object({
  type: z.enum(['all', 'workout', 'cardio']).optional().default('all'),
  status: SessionStatusSchema.optional(),
});
export type SessionListQuery = z.infer<typeof SessionListQuerySchema>;

export const SessionItemSchema = z.object({
  id: z.number().int(),
  sessionType: SessionTypeSchema,
  status: SessionStatusSchema,
  performedAt: z.string().datetime(),
  workoutId: z.number().int().nullable(),
  cardio: CardioPayloadSchema.nullable(),
});
export type SessionItem = z.infer<typeof SessionItemSchema>;

export const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionItemSchema),
});
export type SessionsListResponse = z.infer<typeof SessionsListResponseSchema>;
