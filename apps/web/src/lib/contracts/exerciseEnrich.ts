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

export type MatchSuggestion = {
  inputName: string;
  suggestedName: string;
  category: EnrichedExercise['category'];
  primaryMuscles: EnrichedExercise['primaryMuscles'];
  secondaryMuscles: EnrichedExercise['secondaryMuscles'];
  matchType: 'exact' | 'whole_alias' | 'token_alias';
};

export const EnrichToolResponseSchema = z.object({
  exercises: z.array(EnrichedExerciseSchema),
});

export type EnrichResponse =
  | { exercises: EnrichedExercise[]; matchSuggestions?: MatchSuggestion[] }
  | { error: string };
