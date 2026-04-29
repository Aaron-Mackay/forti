import { describe, expect, it } from 'vitest';
import {
  bodyweightDisplayToKg,
  formatBodyweight,
  kgToBodyweightDisplay,
} from './units';

describe('bodyweight unit conversions', () => {
  it('converts kg to lb and back', () => {
    expect(kgToBodyweightDisplay(100, 'lb')).toBe(220.5);
    const kg = bodyweightDisplayToKg(220.5, 'lb');
    expect(Math.abs(kg - 100)).toBeLessThan(0.05);
  });

  it('converts kg to st and back', () => {
    expect(kgToBodyweightDisplay(100, 'st')).toBe(15.7);
    const kg = bodyweightDisplayToKg(15.7, 'st');
    expect(Math.abs(kg - 99.7)).toBeLessThan(0.1);
  });

  it('formats decimal stone values', () => {
    expect(formatBodyweight(80, 'st')).toBe('12.6 st');
  });
});
