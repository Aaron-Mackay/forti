import { describe, expect, it } from 'vitest';
import type { Metric } from '@/generated/prisma/browser';
import { mergeOptimisticMetricPoints, resolveRelativeRange } from './dataVizChartUtils';

function makeMetric(partial: Partial<Metric> = {}): Metric {
  return {
    id: partial.id ?? 1,
    userId: partial.userId ?? 'user-1',
    date: partial.date ?? new Date('2026-01-05T00:00:00.000Z'),
    weight: partial.weight ?? null,
    steps: partial.steps ?? null,
    sleepMins: partial.sleepMins ?? null,
    calories: partial.calories ?? null,
    protein: partial.protein ?? null,
    carbs: partial.carbs ?? null,
    fat: partial.fat ?? null,
    customMetrics: partial.customMetrics ?? null,
  };
}

describe('resolveRelativeRange', () => {
  it('anchors relative ranges to the check-in day inclusive', () => {
    expect(resolveRelativeRange(4, 0, '2026-05-12')).toEqual({
      startDate: '2026-04-21',
      endDate: '2026-05-19',
    });
  });
});

describe('mergeOptimisticMetricPoints', () => {
  it('overrides fetched points with optimistic metric edits and adds missing days', () => {
    const merged = mergeOptimisticMetricPoints({
      points: [
        { date: '2026-05-12', value: 1000 },
        { date: '2026-05-13', value: 2000 },
      ],
      optimisticMetrics: [
        makeMetric({ date: new Date('2026-05-13T00:00:00.000Z'), steps: 2345 }),
        makeMetric({ id: 2, date: new Date('2026-05-14T00:00:00.000Z'), steps: 3456 }),
      ],
      metricKey: 'steps',
      startDate: '2026-05-01',
      endDate: '2026-05-19',
    });

    expect(merged).toEqual([
      { x: new Date('2026-05-12').getTime(), y: 1000 },
      { x: new Date('2026-05-13').getTime(), y: 2345 },
      { x: new Date('2026-05-14').getTime(), y: 3456 },
    ]);
  });

  it('removes fetched points when the optimistic metric has been cleared', () => {
    const merged = mergeOptimisticMetricPoints({
      points: [
        { date: '2026-05-12', value: 1000 },
      ],
      optimisticMetrics: [
        makeMetric({ date: new Date('2026-05-12T00:00:00.000Z'), steps: null }),
      ],
      metricKey: 'steps',
      startDate: '2026-05-01',
      endDate: '2026-05-19',
    });

    expect(merged).toEqual([]);
  });
});
