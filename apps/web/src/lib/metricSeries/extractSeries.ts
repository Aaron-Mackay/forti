import type { MetricPrisma } from '@/types/dataTypes';
import { getCustomMetricsData } from '@/app/user/calendar/MetricBar';
import { kgToBodyweightDisplay } from '@/lib/units';
import type { Settings } from '@/types/settingsTypes';
import type { BuiltInMetricKey, MetricKey } from '@/types/metricTypes';

export type MetricPoint = { date: Date; value: number };

const BUILTIN_FIELDS: Record<BuiltInMetricKey, (m: MetricPrisma) => number | null | undefined> = {
  weight:    (m) => m.weight,
  steps:     (m) => m.steps,
  sleepMins: (m) => m.sleepMins,
  calories:  (m) => m.calories,
  protein:   (m) => m.protein,
  carbs:     (m) => m.carbs,
  fat:       (m) => m.fat,
};

function isBuiltIn(key: MetricKey): key is BuiltInMetricKey {
  return key in BUILTIN_FIELDS;
}

export function extractMetricSeries(metrics: MetricPrisma[], key: MetricKey, settings: Settings): MetricPoint[] {
  const points: MetricPoint[] = [];
  const builtIn = isBuiltIn(key);
  const getter = builtIn ? BUILTIN_FIELDS[key] : null;

  for (const row of metrics) {
    let raw: number | null | undefined;
    if (getter) {
      raw = getter(row);
    } else {
      const custom = getCustomMetricsData(row.customMetrics);
      raw = custom[key]?.value;
    }
    if (raw == null) continue;
    const value = key === 'weight'
      ? kgToBodyweightDisplay(raw, settings.bodyweightUnit) ?? raw
      : raw;
    points.push({ date: new Date(row.date), value });
  }

  points.sort((a, b) => a.date.getTime() - b.date.getTime());
  return points;
}
