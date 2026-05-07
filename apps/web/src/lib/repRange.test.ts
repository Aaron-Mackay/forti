import { describe, expect, it } from 'vitest';
import { NullablePlanRepRangeSchema, normalizeRepRange, parseRepRange, RepRangeSchema } from '@/lib/repRange';

describe('parseRepRange', () => {
  it('parses exact', () => {
    expect(parseRepRange('10')).toEqual({ kind: 'exact', value: 10 });
  });

  it('parses range with spaces', () => {
    expect(parseRepRange(' 5 - 10 ')).toEqual({ kind: 'range', min: 5, max: 10 });
  });

  it('parses plus', () => {
    expect(parseRepRange('5+')).toEqual({ kind: 'plus', min: 5 });
  });

  it('parses amrap case-insensitively', () => {
    expect(parseRepRange('amrap')).toEqual({ kind: 'amrap' });
  });

  it('rejects invalid range order', () => {
    expect(parseRepRange('10-5')).toBeNull();
  });
});

describe('normalizeRepRange', () => {
  it('normalizes valid values', () => {
    expect(normalizeRepRange(' 5 - 10 ')).toBe('5-10');
    expect(normalizeRepRange(' amrap ')).toBe('AMRAP');
    expect(normalizeRepRange(' 5 + ')).toBe('5+');
  });

  it('returns null for invalid values', () => {
    expect(normalizeRepRange('abc')).toBeNull();
  });
});

describe('RepRangeSchema', () => {
  it('returns normalized value', () => {
    expect(RepRangeSchema.parse(' amrap ')).toBe('AMRAP');
  });

  it('fails invalid value', () => {
    expect(() => RepRangeSchema.parse('invalid')).toThrow();
  });
});


describe('NullablePlanRepRangeSchema', () => {
  it('accepts empty strings used by new workout exercises', () => {
    expect(NullablePlanRepRangeSchema.parse('')).toBe('');
  });

  it('accepts legacy BFR rep ranges', () => {
    expect(NullablePlanRepRangeSchema.parse('30-15-15-15')).toBe('30-15-15-15');
    expect(NullablePlanRepRangeSchema.parse(' 30 - 15 - 15 - 15 ')).toBe('30-15-15-15');
  });
});
