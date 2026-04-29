import { describe, expect, it } from 'vitest';
import { ExerciseInputSchema } from './planSchemas';

describe('ExerciseInputSchema', () => {
  it('defaults requiresRecording to false when omitted', () => {
    const parsed = ExerciseInputSchema.parse({
      exercise: { name: 'Bench Press', category: 'strength' },
      order: 1,
      repRange: '6-8',
      sets: [],
    });

    expect(parsed.requiresRecording).toBe(false);
  });
});

