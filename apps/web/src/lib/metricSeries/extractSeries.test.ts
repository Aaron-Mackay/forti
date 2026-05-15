import { describe, expect, it } from 'vitest';
import { extractMetricSeries } from './extractSeries';
import type { MetricPrisma } from '@/types/dataTypes';
import { DEFAULT_SETTINGS, type Settings } from '@/types/settingsTypes';

function makeMetric(date: string, overrides: Partial<MetricPrisma> = {}): MetricPrisma {
  return {
    id: 0,
    userId: 'u',
    date: new Date(date),
    weight: null,
    steps: null,
    sleepMins: null,
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    customMetrics: null,
    ...overrides,
  } as MetricPrisma;
}

const settings: Settings = { ...DEFAULT_SETTINGS };

describe('extractMetricSeries', () => {
  it('extracts a built-in weight series, ignoring nulls and sorting by date', () => {
    const metrics: MetricPrisma[] = [
      makeMetric('2026-05-10', { weight: 84.0 }),
      makeMetric('2026-05-08', { weight: 84.2 }),
      makeMetric('2026-05-09', { weight: null }),
    ];
    const points = extractMetricSeries(metrics, 'weight', settings);
    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(84.2);
    expect(points[1].value).toBe(84.0);
    expect(points[0].date.getTime()).toBeLessThan(points[1].date.getTime());
  });

  it('converts weight to lb when bodyweightUnit is lb', () => {
    const metrics: MetricPrisma[] = [makeMetric('2026-05-10', { weight: 80 })];
    const lbSettings: Settings = { ...settings, bodyweightUnit: 'lb' };
    const [p] = extractMetricSeries(metrics, 'weight', lbSettings);
    expect(p.value).toBeCloseTo(176.4, 1);
  });

  it('extracts a custom metric series from customMetrics JSON', () => {
    const customId = 'energy-uuid';
    const metrics: MetricPrisma[] = [
      makeMetric('2026-05-08', { customMetrics: { [customId]: { value: 4, target: 5 } } }),
      makeMetric('2026-05-09', { customMetrics: { [customId]: { value: null, target: 5 } } }),
      makeMetric('2026-05-10', { customMetrics: { [customId]: { value: 3, target: 5 } } }),
    ];
    const points = extractMetricSeries(metrics, customId, settings);
    expect(points).toHaveLength(2);
    expect(points.map((p) => p.value)).toEqual([4, 3]);
  });

  it('returns an empty array when no rows have a value for the key', () => {
    const metrics: MetricPrisma[] = [makeMetric('2026-05-10', { steps: 1000 })];
    expect(extractMetricSeries(metrics, 'weight', settings)).toEqual([]);
  });
});
