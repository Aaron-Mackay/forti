import { describe, expect, it } from 'vitest'

import {
  getDefaultRepsFromParsedRepRange,
  NullablePlanRepRangeSchema,
  normalizeRepRange,
  parseRepRange,
  REP_RANGE_AMRAP_DEFAULT_REPS,
  RepRangeSchema,
} from './repRange'

describe('parseRepRange', () => {
  it('parses exact values', () => {
    expect(parseRepRange('10')).toEqual({ kind: 'exact', value: 10 })
  })

  it('parses range values', () => {
    expect(parseRepRange('5-10')).toEqual({ kind: 'range', min: 5, max: 10 })
  })

  it('parses plus values', () => {
    expect(parseRepRange('5+')).toEqual({ kind: 'plus', min: 5 })
  })

  it('parses AMRAP values case-insensitively', () => {
    expect(parseRepRange('AMRAP')).toEqual({ kind: 'amrap' })
    expect(parseRepRange('  amrap  ')).toEqual({ kind: 'amrap' })
  })

  it('handles whitespace variants around separators', () => {
    expect(parseRepRange(' 5 - 10 ')).toEqual({ kind: 'range', min: 5, max: 10 })
    expect(parseRepRange(' 5 + ')).toEqual({ kind: 'plus', min: 5 })
  })

  it('returns null for malformed inputs', () => {
    expect(parseRepRange('')).toBeNull()
    expect(parseRepRange('   ')).toBeNull()
    expect(parseRepRange('0')).toBeNull()
    expect(parseRepRange('10-5')).toBeNull()
    expect(parseRepRange('5++')).toBeNull()
    expect(parseRepRange('foo')).toBeNull()
    expect(parseRepRange('5-AMRAP')).toBeNull()
  })
})

describe('normalizeRepRange', () => {
  it('normalizes valid values', () => {
    expect(normalizeRepRange(' 5 - 10 ')).toBe('5-10')
    expect(normalizeRepRange(' amrap ')).toBe('AMRAP')
    expect(normalizeRepRange(' 5 + ')).toBe('5+')
  })

  it('returns null for invalid values', () => {
    expect(normalizeRepRange('abc')).toBeNull()
  })
})

describe('getDefaultRepsFromParsedRepRange', () => {
  it('uses deterministic defaults by parsed kind', () => {
    expect(getDefaultRepsFromParsedRepRange({ kind: 'exact', value: 10 })).toBe(10)
    expect(getDefaultRepsFromParsedRepRange({ kind: 'range', min: 5, max: 10 })).toBe(5)
    expect(getDefaultRepsFromParsedRepRange({ kind: 'plus', min: 5 })).toBe(5)
    expect(getDefaultRepsFromParsedRepRange({ kind: 'amrap' })).toBe(REP_RANGE_AMRAP_DEFAULT_REPS)
  })
})

describe('RepRangeSchema', () => {
  it('returns normalized value', () => {
    expect(RepRangeSchema.parse(' amrap ')).toBe('AMRAP')
  })

  it('fails invalid value', () => {
    expect(() => RepRangeSchema.parse('invalid')).toThrow()
  })
})

describe('NullablePlanRepRangeSchema', () => {
  it('accepts empty strings used by new workout exercises', () => {
    expect(NullablePlanRepRangeSchema.parse('')).toBe('')
  })

  it('accepts legacy BFR rep ranges', () => {
    expect(NullablePlanRepRangeSchema.parse('30-15-15-15')).toBe('30-15-15-15')
    expect(NullablePlanRepRangeSchema.parse(' 30 - 15 - 15 - 15 ')).toBe('30-15-15-15')
  })
})
