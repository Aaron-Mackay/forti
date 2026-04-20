// Shared metric key types, centralised here so they can be used by both
// the calendar/dashboard UI (MetricBar.tsx re-exports these) and the
// coach check-in template dataviz card configuration.

export type BuiltInMetricKey =
  | 'weight' | 'steps' | 'sleepMins' | 'calories' | 'protein' | 'carbs' | 'fat';

export const BUILTIN_METRIC_KEYS: BuiltInMetricKey[] = [
  'weight', 'steps', 'sleepMins', 'calories', 'protein', 'carbs', 'fat',
];

export const BUILTIN_METRIC_LABELS: Record<BuiltInMetricKey, string> = {
  weight:   'Weight (kg)',
  steps:    'Steps',
  sleepMins:'Sleep (mins)',
  calories: 'Calories',
  protein:  'Protein (g)',
  carbs:    'Carbs (g)',
  fat:      'Fat (g)',
};

// Union with custom metric UUID strings — mirrors the existing MetricKey from MetricBar.tsx.
export type MetricKey = BuiltInMetricKey | string;
