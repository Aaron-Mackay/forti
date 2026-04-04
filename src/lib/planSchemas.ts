import {z} from "zod";
import { NullablePlanRepRangeSchema } from "@/lib/repRange";

export const SetInputSchema = z.object({
  id: z.number().optional(),
  weight: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  rpe: z.number().nullable().optional(),
  rir: z.number().int().nullable().optional(),
  order: z.number().int(),
  isDropSet: z.boolean().optional().default(false),
  parentSetId: z.number().nullable().optional(),
});

export const ExerciseInputSchema = z.object({
  exercise: z.object({
    id: z.number().optional().nullable(),
    name: z.string(),
    category: z.string(),
    primaryMuscles: z.array(z.string()).optional().default([]),
    secondaryMuscles: z.array(z.string()).optional().default([]),
  }),
  order: z.number().int(),
  repRange: NullablePlanRepRangeSchema,
  restTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  targetRpe: z.number().nullable().optional(),
  targetRir: z.number().int().nullable().optional(),
  isBfr: z.boolean().optional().default(false),
  sets: z.array(SetInputSchema),
});

export const WorkoutInputSchema = z.object({
  name: z.string(),
  notes: z.string().nullable().optional(),
  order: z.number().int(),
  dateCompleted: z.string().nullable().optional(),
  exercises: z.array(ExerciseInputSchema),
});

export const WeekInputSchema = z.object({
  order: z.number().int(),
  workouts: z.array(WorkoutInputSchema),
});

// Used by POST /api/saveUserWorkoutData (userId lives at the top level there)
export const PlanInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  order: z.number().int(),
  weeks: z.array(WeekInputSchema),
});

// Used by POST /api/plan (userId is required at the plan level)
export const PlanPostSchema = PlanInputSchema.extend({
  userId: z.string(),
});
