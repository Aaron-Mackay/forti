import { z } from 'zod';

const optionalTrimmedSearch = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).max(100).optional(),
);

export const ExerciseListQuerySchema = z.object({
  search: optionalTrimmedSearch,
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});
export type ExerciseListQuery = z.infer<typeof ExerciseListQuerySchema>;
