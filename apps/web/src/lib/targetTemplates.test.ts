import { describe, it, expect } from 'vitest';
import { getMacrosByDow } from './targetTemplates';
import type { TargetTemplateWithDays } from './targetTemplates';

// findActiveTemplate is a local helper in NutritionClient — test the equivalent
// inline logic here since it isn't exported from the lib.
function findActiveTemplate(
  templates: TargetTemplateWithDays[],
  weekStart: Date,
): TargetTemplateWithDays | null {
  const weekTime = weekStart.getTime();
  return (
    [...templates]
      .filter(t => new Date(t.effectiveFrom).getTime() <= weekTime)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0] ??
    null
  );
}

const makeTemplate = (
  id: number,
  effectiveFrom: string,
  overrides: Partial<TargetTemplateWithDays> = {},
): TargetTemplateWithDays => ({
  id,
  userId: 'user-1',
  effectiveFrom: new Date(effectiveFrom),
  createdAt: new Date(effectiveFrom),
  stepsTarget: null,
  sleepMinsTarget: null,
  days: [],
  ...overrides,
});

describe('getMacrosByDow', () => {
  it('returns all-null for each day when template is null', () => {
    const result = getMacrosByDow(null);
    for (let dow = 1; dow <= 7; dow++) {
      expect(result[dow]).toEqual({
        caloriesTarget: null,
        proteinTarget: null,
        carbsTarget: null,
        fatTarget: null,
      });
    }
  });

  it('returns all-null for days not present in the template', () => {
    const template = makeTemplate(1, '2026-03-30', { days: [] });
    const result = getMacrosByDow(template);
    expect(result[1]).toEqual({ caloriesTarget: null, proteinTarget: null, carbsTarget: null, fatTarget: null });
  });

  it('returns correct macros for a day that is present', () => {
    const template = makeTemplate(1, '2026-03-30', {
      days: [
        { id: 1, templateId: 1, dayOfWeek: 1, caloriesTarget: 2500, proteinTarget: 160, carbsTarget: 280, fatTarget: 70 },
        { id: 2, templateId: 1, dayOfWeek: 7, caloriesTarget: 2000, proteinTarget: 140, carbsTarget: 220, fatTarget: 60 },
      ],
    });
    const result = getMacrosByDow(template);
    expect(result[1]).toEqual({ caloriesTarget: 2500, proteinTarget: 160, carbsTarget: 280, fatTarget: 70 });
    expect(result[7]).toEqual({ caloriesTarget: 2000, proteinTarget: 140, carbsTarget: 220, fatTarget: 60 });
    // Days not in the template should be null
    expect(result[3]).toEqual({ caloriesTarget: null, proteinTarget: null, carbsTarget: null, fatTarget: null });
  });

  it('stepsTarget and sleepMinsTarget live on the template header, not on day rows', () => {
    const template = makeTemplate(1, '2026-03-30', {
      stepsTarget: 10000,
      sleepMinsTarget: 480,
      days: [
        { id: 1, templateId: 1, dayOfWeek: 1, caloriesTarget: 2500, proteinTarget: 160, carbsTarget: 280, fatTarget: 70 },
      ],
    });
    // Header fields are on the template itself, not inside getMacrosByDow result
    expect(template.stepsTarget).toBe(10000);
    expect(template.sleepMinsTarget).toBe(480);
    // getMacrosByDow does not include steps/sleep
    expect(Object.keys(getMacrosByDow(template)[1])).not.toContain('stepsTarget');
  });
});

describe('findActiveTemplate (backwards lookup)', () => {
  const t1 = makeTemplate(1, '2026-03-16'); // week of Mar 16
  const t2 = makeTemplate(2, '2026-03-30'); // week of Mar 30
  const t3 = makeTemplate(3, '2026-04-06'); // week of Apr 6

  it('returns null when no templates exist', () => {
    expect(findActiveTemplate([], new Date('2026-04-03'))).toBeNull();
  });

  it('returns null when all templates are after the given weekStart', () => {
    expect(findActiveTemplate([t3], new Date('2026-03-30'))).toBeNull();
  });

  it('returns the exact-match template when effectiveFrom equals weekStart', () => {
    const result = findActiveTemplate([t1, t2, t3], new Date('2026-03-30'));
    expect(result?.id).toBe(2);
  });

  it('returns the most recent template before weekStart', () => {
    // Apr 3 is between t2 (Mar 30) and t3 (Apr 6) — should return t2
    const result = findActiveTemplate([t1, t2, t3], new Date('2026-04-03'));
    expect(result?.id).toBe(2);
  });

  it('returns the latest template when weekStart is after all templates', () => {
    const result = findActiveTemplate([t1, t2, t3], new Date('2026-05-01'));
    expect(result?.id).toBe(3);
  });

  it('handles unsorted input correctly', () => {
    const result = findActiveTemplate([t3, t1, t2], new Date('2026-04-03'));
    expect(result?.id).toBe(2);
  });
});
