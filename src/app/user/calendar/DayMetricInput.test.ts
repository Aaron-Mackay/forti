import {describe, expect, it} from 'vitest';
import {parseMetricInputValue} from './DayMetricInput';

describe('parseMetricInputValue', () => {
  it('returns null for empty string', () => {
    expect(parseMetricInputValue('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseMetricInputValue(null)).toBeNull();
  });

  it('parses numeric strings and numbers', () => {
    expect(parseMetricInputValue('123')).toBe(123);
    expect(parseMetricInputValue(95)).toBe(95);
  });

  it('returns null for non-numeric strings', () => {
    expect(parseMetricInputValue('abc')).toBeNull();
  });
});
