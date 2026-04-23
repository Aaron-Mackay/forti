import { describe, expect, it } from 'vitest';
import {
  computeMacroGramsFromPercents,
  deriveMacroPercentsFromTargets,
  isMacroPercentSplitValid,
  sumMacroPercents,
} from './macroTargets';

describe('computeMacroGramsFromPercents', () => {
  it('computes macro grams from calories and percentages', () => {
    expect(
      computeMacroGramsFromPercents(2000, {
        proteinPct: 30,
        carbsPct: 40,
        fatPct: 30,
      }),
    ).toEqual({
      protein: 150,
      carbs: 200,
      fat: 67,
    });
  });

  it('returns zero grams when calories are zero or missing', () => {
    expect(computeMacroGramsFromPercents(0, { proteinPct: 40, carbsPct: 30, fatPct: 30 }))
      .toEqual({ protein: 0, carbs: 0, fat: 0 });
    expect(computeMacroGramsFromPercents(null, { proteinPct: 40, carbsPct: 30, fatPct: 30 }))
      .toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('deriveMacroPercentsFromTargets', () => {
  it('derives percentages from existing grams and calories', () => {
    expect(
      deriveMacroPercentsFromTargets(2000, {
        protein: 150,
        carbs: 200,
        fat: 67,
      }),
    ).toEqual({
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30,
    });
  });

  it('normalizes derived percentages to exactly 100', () => {
    const pct = deriveMacroPercentsFromTargets(2100, {
      protein: 160,
      carbs: 210,
      fat: 65,
    });
    expect(sumMacroPercents(pct)).toBe(100);
  });
});

describe('isMacroPercentSplitValid', () => {
  it('requires 100% split when calories are above zero', () => {
    expect(isMacroPercentSplitValid(2200, { proteinPct: 40, carbsPct: 30, fatPct: 30 })).toBe(true);
    expect(isMacroPercentSplitValid(2200, { proteinPct: 35, carbsPct: 30, fatPct: 30 })).toBe(false);
  });

  it('requires either 0% or 100% split when calories are zero or missing', () => {
    expect(isMacroPercentSplitValid(0, { proteinPct: 0, carbsPct: 0, fatPct: 0 })).toBe(true);
    expect(isMacroPercentSplitValid(0, { proteinPct: 40, carbsPct: 30, fatPct: 30 })).toBe(true);
    expect(isMacroPercentSplitValid(null, { proteinPct: 10, carbsPct: 10, fatPct: 10 })).toBe(false);
  });
});
