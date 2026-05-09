import { z } from 'zod';
import { EXERCISE_MUSCLES } from '@/types/dataTypes';

export const ExerciseEnrichRequestSchema = z.object({
  exercises: z.array(z.object({ name: z.string().max(100) })),
});
export type ExerciseEnrichRequest = z.infer<typeof ExerciseEnrichRequestSchema>;

export const EnrichedExerciseSchema = z.object({
  name: z.string(),
  category: z.enum(['resistance', 'cardio']),
  primaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)),
  secondaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)),
});
export type EnrichedExercise = z.infer<typeof EnrichedExerciseSchema>;

export const MatchSuggestionSchema = z.object({
  inputName: z.string(),
  suggestedName: z.string(),
  category: EnrichedExerciseSchema.shape.category,
  primaryMuscles: EnrichedExerciseSchema.shape.primaryMuscles,
  secondaryMuscles: EnrichedExerciseSchema.shape.secondaryMuscles,
  matchType: z.enum(['exact', 'whole_alias', 'token_alias']),
});
export type MatchSuggestion = z.infer<typeof MatchSuggestionSchema>;

export const EnrichToolResponseSchema = z.object({
  exercises: z.array(EnrichedExerciseSchema),
});

export const EnrichResponseSchema = z.union([
  z.object({
    exercises: z.array(EnrichedExerciseSchema),
    matchSuggestions: z.array(MatchSuggestionSchema).optional(),
  }),
  z.object({ error: z.string() }),
]);
export type EnrichResponse = z.infer<typeof EnrichResponseSchema>;
