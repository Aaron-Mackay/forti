import { z } from 'zod';

const nullableNumber = z.number().nullable();
const nullableInt = z.number().int().nullable();

export const SetUpdateRequestSchema = z.object({
  reps: nullableInt.optional(),
  weight: nullableNumber.optional(),
  rpe: nullableNumber.optional(),
  rir: nullableInt.optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one of reps, weight, rpe, rir must be provided',
});

export type SetUpdateRequest = z.infer<typeof SetUpdateRequestSchema>;
