import { describe, it, expect } from 'vitest';
import { parseAiPlanResponse, AiParseError } from './aiPlanParser';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const minimalValidInput = {
  name: 'Push/Pull/Legs',
  weeks: [
    {
      workouts: [
        {
          name: 'Push',
          exercises: [
            { name: 'Bench Press', sets: [{ weight: 80, reps: 8 }] },
          ],
        },
      ],
    },
  ],
};

// ── Happy path ────────────────────────────────────────────────────────────────

describe('parseAiPlanResponse — happy path', () => {
  it('returns a valid ParsedPlan from minimal well-formed input', () => {
    const plan = parseAiPlanResponse(minimalValidInput);

    expect(plan.name).toBe('Push/Pull/Legs');
    expect(plan.order).toBe(1);
    expect(plan.weeks).toHaveLength(1);
    expect(plan.weeks[0].order).toBe(1);
    expect(plan.weeks[0].workouts).toHaveLength(1);
  });

  it('assigns sequential order fields to weeks, workouts, exercises and sets', () => {
    const input = {
      name: 'Plan',
      weeks: [
        {
          workouts: [
            {
              name: 'Day 1',
              exercises: [
                { name: 'Squat', sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] },
                { name: 'Bench', sets: [{ reps: 8 }] },
              ],
            },
            { name: 'Day 2', exercises: [{ name: 'Deadlift', sets: [] }] },
          ],
        },
        {
          workouts: [
            { name: 'Day 3', exercises: [{ name: 'OHP', sets: [] }] },
          ],
        },
      ],
    };

    const plan = parseAiPlanResponse(input);

    expect(plan.weeks[0].order).toBe(1);
    expect(plan.weeks[1].order).toBe(2);
    expect(plan.weeks[0].workouts[0].order).toBe(1);
    expect(plan.weeks[0].workouts[1].order).toBe(2);
    expect(plan.weeks[0].workouts[0].exercises[0].order).toBe(1);
    expect(plan.weeks[0].workouts[0].exercises[1].order).toBe(2);
    expect(plan.weeks[0].workouts[0].exercises[0].sets[0].order).toBe(1);
    expect(plan.weeks[0].workouts[0].exercises[0].sets[2].order).toBe(3);
  });

  it('sets dateCompleted to null on all workouts', () => {
    const plan = parseAiPlanResponse(minimalValidInput);
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        expect(workout.dateCompleted).toBeNull();
      }
    }
  });
});

// ── Missing optional fields → sensible defaults ───────────────────────────────

describe('parseAiPlanResponse — optional fields', () => {
  it('defaults category to "resistance" when omitted', () => {
    const plan = parseAiPlanResponse(minimalValidInput);
    expect(plan.weeks[0].workouts[0].exercises[0].exercise.category).toBe('resistance');
  });

  it('sets repRange, restTime, notes to null when omitted', () => {
    const plan = parseAiPlanResponse(minimalValidInput);
    const ex = plan.weeks[0].workouts[0].exercises[0];
    expect(ex.repRange).toBeNull();
    expect(ex.restTime).toBeNull();
    expect(ex.notes).toBeNull();
  });

  it('sets set weight and reps to null when omitted', () => {
    const input = {
      name: 'Plan',
      weeks: [
        {
          workouts: [
            { name: 'W1', exercises: [{ name: 'Curl', sets: [{}] }] },
          ],
        },
      ],
    };

    const plan = parseAiPlanResponse(input);
    const set = plan.weeks[0].workouts[0].exercises[0].sets[0];
    expect(set.weight).toBeNull();
    expect(set.reps).toBeNull();
  });

  it('handles empty sets array on an exercise', () => {
    const input = {
      name: 'Plan',
      weeks: [
        { workouts: [{ name: 'W1', exercises: [{ name: 'OHP', sets: [] }] }] },
      ],
    };

    const plan = parseAiPlanResponse(input);
    expect(plan.weeks[0].workouts[0].exercises[0].sets).toHaveLength(0);
  });

  it('preserves optional description when provided', () => {
    const input = { ...minimalValidInput, description: 'A great plan' };
    const plan = parseAiPlanResponse(input);
    expect(plan.description).toBe('A great plan');
  });

  it('sets description to null when absent', () => {
    const plan = parseAiPlanResponse(minimalValidInput);
    expect(plan.description).toBeNull();
  });

  it('preserves category, repRange, restTime and exercise notes when provided', () => {
    const input = {
      name: 'Plan',
      weeks: [
        {
          workouts: [
            {
              name: 'Push',
              exercises: [
                {
                  name: 'Bench',
                  category: 'resistance',
                  repRange: '8-12',
                  restTime: '90',
                  notes: 'Pause at bottom',
                  sets: [{ weight: 80, reps: 10 }],
                },
              ],
            },
          ],
        },
      ],
    };

    const plan = parseAiPlanResponse(input);
    const ex = plan.weeks[0].workouts[0].exercises[0];
    expect(ex.exercise.category).toBe('resistance');
    expect(ex.repRange).toBe('8-12');
    expect(ex.restTime).toBe('90');
    expect(ex.notes).toBe('Pause at bottom');
  });
});

// ── Extra unknown fields → ignored cleanly ────────────────────────────────────

describe('parseAiPlanResponse — extra fields stripped', () => {
  it('ignores unrecognised top-level fields', () => {
    const input = { ...minimalValidInput, unknownField: 'surprise' };
    expect(() => parseAiPlanResponse(input)).not.toThrow();
  });

  it('ignores unrecognised fields on exercises (e.g. tempo)', () => {
    const input = {
      name: 'Plan',
      weeks: [
        {
          workouts: [
            {
              name: 'Day 1',
              exercises: [
                { name: 'Press', sets: [{ weight: 60, reps: 5, tempo: '3-1-2' }] },
              ],
            },
          ],
        },
      ],
    };
    expect(() => parseAiPlanResponse(input)).not.toThrow();
    const set = parseAiPlanResponse(input).weeks[0].workouts[0].exercises[0].sets[0];
    expect(set).not.toHaveProperty('tempo');
  });

  it('preserves rpe and rir on sets when provided', () => {
    const input = {
      name: 'Strength Block',
      weeks: [
        {
          workouts: [
            {
              name: 'Day 1',
              exercises: [
                {
                  name: 'Squat',
                  sets: [
                    { weight: 100, reps: 5, rpe: 8 },
                    { weight: 100, reps: 5, rir: 2 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const sets = parseAiPlanResponse(input).weeks[0].workouts[0].exercises[0].sets;
    expect(sets[0]).toMatchObject({ weight: 100, reps: 5, rpe: 8 });
    expect(sets[0].rir).toBeNull();
    expect(sets[1]).toMatchObject({ weight: 100, reps: 5, rir: 2 });
    expect(sets[1].rpe).toBeNull();
  });
});

// ── Malformed / partial JSON → throws AiParseError ───────────────────────────

describe('parseAiPlanResponse — validation errors', () => {
  it('throws AiParseError for null input', () => {
    expect(() => parseAiPlanResponse(null)).toThrow(AiParseError);
  });

  it('throws AiParseError when plan name is missing', () => {
    const input = { weeks: [{ workouts: [] }] };
    expect(() => parseAiPlanResponse(input)).toThrow(AiParseError);
  });

  it('throws AiParseError when plan name is empty string', () => {
    const input = { name: '', weeks: [{ workouts: [] }] };
    expect(() => parseAiPlanResponse(input)).toThrow(AiParseError);
  });

  it('throws AiParseError when weeks array is empty', () => {
    const input = { name: 'Plan', weeks: [] };
    expect(() => parseAiPlanResponse(input)).toThrow(AiParseError);
  });

  it('throws AiParseError when weeks is missing entirely', () => {
    const input = { name: 'Plan' };
    expect(() => parseAiPlanResponse(input)).toThrow(AiParseError);
  });

  it('throws AiParseError when exercise name is empty', () => {
    const input = {
      name: 'Plan',
      weeks: [
        { workouts: [{ name: 'W1', exercises: [{ name: '', sets: [] }] }] },
      ],
    };
    expect(() => parseAiPlanResponse(input)).toThrow(AiParseError);
  });

  it('exposes Zod issues on the thrown error', () => {
    try {
      parseAiPlanResponse({ weeks: [] });
    } catch (err) {
      expect(err).toBeInstanceOf(AiParseError);
      expect((err as AiParseError).issues.length).toBeGreaterThan(0);
    }
  });
});
