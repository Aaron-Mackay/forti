import type { MetricPrisma } from '@/types/dataTypes';
import type { CustomMetricDef, Settings } from '@/types/settingsTypes';
import type { BuiltInMetricKey, MetricKey } from '@/types/metricTypes';
import { getCustomMetricsData } from '@/app/user/calendar/MetricBar';
import { extractMetricSeries } from './extractSeries';
import { getMetricFormatter, type MetricFormatter } from './formatMetricValue';

export type TrackedMetric = {
  key: MetricKey;
  label: string;
  customDef?: CustomMetricDef;
  formatter: MetricFormatter;
};

const BUILTIN_LABELS: Record<BuiltInMetricKey, string> = {
  weight:    'Bodyweight',
  sleepMins: 'Sleep',
  steps:     'Steps',
  calories:  'Calories',
  protein:   'Protein',
  carbs:     'Carbs',
  fat:       'Fat',
};

const BUILTIN_ORDER: BuiltInMetricKey[] = ['weight', 'sleepMins', 'steps', 'calories', 'protein', 'carbs', 'fat'];

function builtInHasData(metrics: MetricPrisma[], key: BuiltInMetricKey): boolean {
  return metrics.some((m) => m[key] != null);
}

export function getTrackedMetrics(metrics: MetricPrisma[], settings: Settings): TrackedMetric[] {
  const tracked: TrackedMetric[] = [];

  for (const key of BUILTIN_ORDER) {
    if (!builtInHasData(metrics, key)) continue;
    tracked.push({
      key,
      label: BUILTIN_LABELS[key],
      formatter: getMetricFormatter(key, settings),
    });
  }

  for (const def of settings.customMetrics) {
    tracked.push({
      key: def.id,
      label: def.name,
      customDef: def,
      formatter: getMetricFormatter(def.id, settings, def),
    });
  }

  return tracked;
}

/** Build the catalog plus per-metric series in a single pass-friendly shape. */
export function buildMetricViews(metrics: MetricPrisma[], settings: Settings) {
  const tracked = getTrackedMetrics(metrics, settings);
  return tracked.map((t) => ({
    ...t,
    series: extractMetricSeries(metrics, t.key, settings),
  }));
}

/** Pick the latest non-null value for the given key, ignoring conversion (used for delta chips). */
export function latestRawValue(metrics: MetricPrisma[], key: MetricKey): number | null {
  for (let i = metrics.length - 1; i >= 0; i--) {
    const row = metrics[i];
    if ((['weight','steps','sleepMins','calories','protein','carbs','fat'] as MetricKey[]).includes(key)) {
      const v = (row as unknown as Record<string, number | null>)[key as string];
      if (v != null) return v;
    } else {
      const custom = getCustomMetricsData(row.customMetrics);
      const v = custom[key]?.value;
      if (v != null) return v;
    }
  }
  return null;
}
