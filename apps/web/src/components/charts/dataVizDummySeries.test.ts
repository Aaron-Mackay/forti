import { describe, expect, it } from 'vitest';
import { generateDataVizDummySeries } from './dataVizDummySeries';
import type { BuiltInMetricKey } from '@/types/metricTypes';

const METRIC_BOUNDS: Record<BuiltInMetricKey, { min: number; max: number }> = {
  weight: { min: 45, max: 220 },
  steps: { min: 500, max: 30000 },
  sleepMins: { min: 180, max: 720 },
  calories: { min: 800, max: 6000 },
  protein: { min: 20, max: 350 },
  carbs: { min: 30, max: 600 },
  fat: { min: 10, max: 250 },
};

describe('generateDataVizDummySeries', () => {
  it('is deterministic for same metric/range/seed', () => {
    const a = generateDataVizDummySeries({
      metric: 'weight',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      seedKey: 'card-a',
    });
    const b = generateDataVizDummySeries({
      metric: 'weight',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      seedKey: 'card-a',
    });
    expect(a).toEqual(b);
  });

  it('uses the provided date range for x-axis points', () => {
    const startDate = '2026-02-01';
    const endDate = '2026-02-28';
    const series = generateDataVizDummySeries({
      metric: 'steps',
      startDate,
      endDate,
      seedKey: 'card-b',
    });

    expect(series.length).toBeGreaterThan(0);
    const minX = Math.min(...series.map(p => p.x));
    const maxX = Math.max(...series.map(p => p.x));
    expect(minX).toBeGreaterThanOrEqual(new Date(startDate).getTime());
    expect(maxX).toBeLessThanOrEqual(new Date(endDate).getTime());
  });

  it('returns values within realistic metric bounds', () => {
    const metrics: BuiltInMetricKey[] = ['weight', 'steps', 'sleepMins', 'calories', 'protein', 'carbs', 'fat'];

    for (const metric of metrics) {
      const series = generateDataVizDummySeries({
        metric,
        startDate: '2026-01-01',
        endDate: '2026-06-01',
        seedKey: `seed-${metric}`,
      });
      const { min, max } = METRIC_BOUNDS[metric];
      expect(series.length).toBeGreaterThan(0);
      expect(series.every(p => p.y >= min && p.y <= max)).toBe(true);
    }
  });

  it('returns empty series for invalid range', () => {
    const series = generateDataVizDummySeries({
      metric: 'calories',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      seedKey: 'card-c',
    });
    expect(series).toEqual([]);
  });
});
