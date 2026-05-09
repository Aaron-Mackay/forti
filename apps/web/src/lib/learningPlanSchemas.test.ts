import { describe, expect, it } from 'vitest';
import { parseStepProgress, StepProgressSchema } from './learningPlanSchemas';

describe('stepProgress JSON schema', () => {
  it('accepts numeric step ids with nullable ISO timestamps', () => {
    const progress = {
      '12': {
        notifiedAt: '2026-05-09T10:00:00.000Z',
        completedAt: null,
      },
    };

    expect(StepProgressSchema.safeParse(progress).success).toBe(true);
    expect(parseStepProgress(progress)).toEqual(progress);
  });

  it('drops invalid stored progress instead of leaking malformed JSON', () => {
    expect(parseStepProgress({
      bad: { notifiedAt: '2026-05-09T10:00:00.000Z', completedAt: null },
    })).toEqual({});
    expect(parseStepProgress({
      '12': { notifiedAt: 'not-a-date', completedAt: null },
    })).toEqual({});
    expect(parseStepProgress(null)).toEqual({});
  });
});
