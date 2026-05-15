import type { CustomMetricDef, Settings } from '@/types/settingsTypes';
import type { BuiltInMetricKey, MetricKey } from '@/types/metricTypes';
import { minToHhMm } from '@/app/user/calendar/utils';

export type MetricKind = 'weight' | 'sleepMins' | 'rating' | 'numeric';

export type MetricFormatter = {
  /** Display the value with its unit. e.g. "84.2 kg", "7h 30m", "4 / 5". */
  full: (value: number) => string;
  /** Display just the magnitude, no unit. e.g. "84.2", "7:30", "4". Used for sparkline tooltips. */
  bare: (value: number) => string;
  /** Display a delta with sign and unit. e.g. "−0.3 kg", "+12m", "hold". */
  delta: (delta: number) => string;
  /** Short unit hint shown in the detail footer. e.g. "kg", "minutes", null for ratings. */
  unitHint: string | null;
};

function fmtNumber(v: number, decimals = 1): string {
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(decimals);
}

function weightFormatter(settings: Settings): MetricFormatter {
  const unit = settings.bodyweightUnit;
  return {
    full: (v) => `${fmtNumber(v)} ${unit}`,
    bare: (v) => fmtNumber(v),
    delta: (d) => {
      if (Math.abs(d) < 0.05) return 'hold';
      const abs = fmtNumber(Math.abs(d));
      return d > 0 ? `+${abs} ${unit}` : `−${abs} ${unit}`;
    },
    unitHint: unit,
  };
}

function sleepFormatter(): MetricFormatter {
  const fmt = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins - h * 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };
  return {
    full: (v) => fmt(v),
    bare: (v) => minToHhMm(Math.round(v)),
    delta: (d) => {
      if (Math.abs(d) < 1) return 'hold';
      const mins = Math.round(Math.abs(d));
      return d > 0 ? `+${mins}m` : `−${mins}m`;
    },
    unitHint: 'hours · minutes',
  };
}

function ratingFormatter(target: number): MetricFormatter {
  return {
    full: (v) => `${fmtNumber(v)} / ${target}`,
    bare: (v) => fmtNumber(v),
    delta: (d) => {
      if (Math.abs(d) < 0.05) return 'hold';
      const abs = fmtNumber(Math.abs(d));
      return d > 0 ? `+${abs}` : `−${abs}`;
    },
    unitHint: `out of ${target}`,
  };
}

function numericFormatter(): MetricFormatter {
  return {
    full: (v) => fmtNumber(v),
    bare: (v) => fmtNumber(v),
    delta: (d) => {
      if (Math.abs(d) < 0.05) return 'hold';
      const abs = fmtNumber(Math.abs(d));
      return d > 0 ? `+${abs}` : `−${abs}`;
    },
    unitHint: null,
  };
}

const NUMERIC_BUILT_INS: BuiltInMetricKey[] = ['steps', 'calories', 'protein', 'carbs', 'fat'];

export function getMetricFormatter(
  key: MetricKey,
  settings: Settings,
  customDef?: CustomMetricDef,
): MetricFormatter {
  if (key === 'weight') return weightFormatter(settings);
  if (key === 'sleepMins') return sleepFormatter();
  if ((NUMERIC_BUILT_INS as MetricKey[]).includes(key)) return numericFormatter();
  // Custom metric. If target is set and small (e.g. 5), render as rating.
  if (customDef?.target != null && customDef.target > 0 && customDef.target <= 10) {
    return ratingFormatter(customDef.target);
  }
  return numericFormatter();
}
