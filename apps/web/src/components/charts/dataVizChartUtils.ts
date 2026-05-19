import type { Metric } from '@/generated/prisma/browser';
import type { MetricHistoryPoint } from '@lib/contracts/metricHistory';
import { getCheckInWeekStart } from '@lib/checkInUtils';
import type { BuiltInMetricKey } from '@/types/metricTypes';

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalizeDate(date: string | Date): Date {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const next = new Date(date);
  return new Date(Date.UTC(
    next.getUTCFullYear(),
    next.getUTCMonth(),
    next.getUTCDate(),
  ));
}

export function resolveRelativeRange(
  weeks: number,
  checkInDay: number,
  rangeAnchorDate?: string | Date,
): { startDate: string; endDate: string } {
  const windowStart = rangeAnchorDate
    ? normalizeDate(rangeAnchorDate)
    : normalizeDate(getCheckInWeekStart(new Date(), checkInDay));
  const end = new Date(windowStart);
  end.setUTCDate(windowStart.getUTCDate() + 7);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - weeks * 7);
  return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
}

function isDateInRange(dateIso: string, startDate: string, endDate: string): boolean {
  return dateIso >= startDate && dateIso <= endDate;
}

export function mergeOptimisticMetricPoints({
  points,
  optimisticMetrics,
  metricKey,
  startDate,
  endDate,
}: {
  points: MetricHistoryPoint[];
  optimisticMetrics?: Metric[];
  metricKey: BuiltInMetricKey;
  startDate: string;
  endDate: string;
}): Array<{ x: number; y: number }> {
  const merged = new Map<string, number>();

  points.forEach(point => {
    if (point.value !== null && isDateInRange(point.date, startDate, endDate)) {
      merged.set(point.date, point.value);
    }
  });

  optimisticMetrics?.forEach(metric => {
    const dateIso = new Date(metric.date).toISOString().slice(0, 10);
    if (!isDateInRange(dateIso, startDate, endDate)) return;
    const value = metric[metricKey];
    if (typeof value === 'number') {
      merged.set(dateIso, value);
      return;
    }
    merged.delete(dateIso);
  });

  return Array.from(merged.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ x: new Date(date).getTime(), y: value }));
}
