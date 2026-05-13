import { describe, expect, it } from 'vitest';
import { estimateWorkoutMinutes, parseWorkoutRestSeconds } from './workoutDurationEstimate';

describe('parseWorkoutRestSeconds', () => {
  it('parses plain numeric rest strings', () => {
    expect(parseWorkoutRestSeconds('90')).toBe(90);
  });

  it('parses suffixed second strings', () => {
    expect(parseWorkoutRestSeconds('90s')).toBe(90);
  });

  it('parses ranged rest strings using the midpoint', () => {
    expect(parseWorkoutRestSeconds('90-120')).toBe(105);
    expect(parseWorkoutRestSeconds('90s-120s')).toBe(105);
    expect(parseWorkoutRestSeconds(' 90 - 120 s ')).toBe(105);
  });

  it('falls back to 120 seconds when missing or invalid', () => {
    expect(parseWorkoutRestSeconds(undefined)).toBe(120);
    expect(parseWorkoutRestSeconds(null)).toBe(120);
    expect(parseWorkoutRestSeconds('')).toBe(120);
    expect(parseWorkoutRestSeconds('fast')).toBe(120);
  });
});

describe('estimateWorkoutMinutes', () => {
  it('calculates total seconds from sets, parsed rest, and warmup time', () => {
    const seconds = estimateWorkoutMinutes({
      exercises: [
        { restTime: '90', sets: [{}, {}, {}] },
        { restTime: '120', sets: [{}, {}] },
      ],
    });

    expect(seconds).toBe(1095);
  });

  it('uses the midpoint for ranged rests', () => {
    const seconds = estimateWorkoutMinutes({
      exercises: [
        { restTime: '90-120', sets: [{}, {}, {}, {}] },
      ],
    });

    expect(seconds).toBe(780);
  });

  it('falls back to 120 seconds when rest is unparseable', () => {
    const seconds = estimateWorkoutMinutes({
      exercises: [
        { restTime: 'unknown', sets: [{}, {}] },
      ],
    });

    expect(seconds).toBe(510);
  });
});
