import { describe, it, expect } from 'vitest';
import { generateWeeks, getMonthLabels } from './calendarUtils';

describe('calendarUtils', () => {
  it('generateWeeks returns correct week arrays', () => {
    const weeks = generateWeeks(new Date(2024, 0, 1), 4);
    expect(weeks).toHaveLength(4);
    weeks.forEach(week => expect(week).toHaveLength(7));
  });

  it('getMonthLabels returns correct labels', () => {
    const weeks = generateWeeks(new Date(2024, 0, 1), 8);
    const labels = getMonthLabels(weeks);
    expect(Object.keys(labels)).toContain('January 2024');
  });
});