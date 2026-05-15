import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeStats, movingAverage } from './metricStats';
import type { MetricPoint } from './extractSeries';

const DAY = 86_400_000;
const FIXED_NOW = new Date('2026-05-15T12:00:00Z').getTime();

function daysAgo(n: number): Date {
  return new Date(FIXED_NOW - n * DAY);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('movingAverage', () => {
  it('returns trailing 7-day averages aligned to each point', () => {
    const series: MetricPoint[] = [
      { date: daysAgo(8), value: 80 },
      { date: daysAgo(6), value: 82 },
      { date: daysAgo(4), value: 84 },
      { date: daysAgo(2), value: 86 },
    ];
    // Trailing window: at d-8 only [80]; at d-6 [80,82]; at d-4 [80,82,84]; at d-2 [80,82,84,86]
    const ma = movingAverage(series, 7);
    expect(ma).toHaveLength(4);
    expect(ma[0].value).toBeCloseTo(80, 5);
    expect(ma[1].value).toBeCloseTo(81, 5);
    expect(ma[2].value).toBeCloseTo(82, 5);
    expect(ma[3].value).toBeCloseTo(83, 5);
  });

  it('handles an empty series', () => {
    expect(movingAverage([], 7)).toEqual([]);
  });
});

describe('computeStats', () => {
  it('reports latest, 7-day avg with blanks, and logged count over a 4-week range', () => {
    const series: MetricPoint[] = [
      { date: daysAgo(20), value: 84.6 },
      { date: daysAgo(10), value: 84.3 },
      { date: daysAgo(5),  value: 84.2 },
      { date: daysAgo(3),  value: 84.0 },
      { date: daysAgo(1),  value: 83.9 },
    ];
    const stats = computeStats(series, '4w');

    expect(stats.latest?.value).toBe(83.9);
    expect(stats.sevenDayAvg?.count).toBe(3); // -5, -3, -1 within last 7 days
    expect(stats.sevenDayAvg?.value).toBeCloseTo((84.2 + 84.0 + 83.9) / 3, 5);
    expect(stats.logged.total).toBe(28);
    expect(stats.logged.count).toBe(5);
    expect(stats.logged.pct).toBeCloseTo(5 / 28, 5);
  });

  it('returns null 4-wk delta when only one point exists', () => {
    const series: MetricPoint[] = [{ date: daysAgo(1), value: 84 }];
    expect(computeStats(series, '4w').fourWeekDelta).toBeNull();
  });

  it('computes 4-wk delta against the closest earlier MA point', () => {
    const series: MetricPoint[] = [];
    for (let d = 30; d >= 0; d--) {
      series.push({ date: daysAgo(d), value: 84 + d * 0.05 });
    }
    const stats = computeStats(series, '12w');
    expect(stats.fourWeekDelta).not.toBeNull();
    expect(stats.fourWeekDelta!.delta).toBeLessThan(0); // weight trending down
  });

  it('uses series start as the range start for "all"', () => {
    const series: MetricPoint[] = [
      { date: daysAgo(100), value: 90 },
      { date: daysAgo(0),   value: 84 },
    ];
    const stats = computeStats(series, 'all');
    expect(stats.logged.total).toBeGreaterThanOrEqual(100);
    expect(stats.logged.count).toBe(2);
  });
});
