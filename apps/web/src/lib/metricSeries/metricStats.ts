import type { MetricPoint } from './extractSeries';
import { rangeDays, type TimeRange } from './timeRange';

const DAY_MS = 86_400_000;

function dayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Trailing 7-day moving average aligned to each point's date.
 *  At point t, average values in [t-6d, t]. Returns one MA point per input point. */
export function movingAverage(series: MetricPoint[], windowDays = 7): MetricPoint[] {
  if (series.length === 0) return [];
  const out: MetricPoint[] = [];
  let lo = 0;
  let sum = 0;
  for (let hi = 0; hi < series.length; hi++) {
    sum += series[hi].value;
    const cutoff = series[hi].date.getTime() - (windowDays - 1) * DAY_MS;
    while (series[lo].date.getTime() < cutoff) {
      sum -= series[lo].value;
      lo++;
    }
    const count = hi - lo + 1;
    out.push({ date: series[hi].date, value: sum / count });
  }
  return out;
}

/** Find the MA value at the point closest to `target` date (or null if none in series). */
function maAt(ma: MetricPoint[], target: number): { value: number; date: Date } | null {
  if (ma.length === 0) return null;
  let best = ma[0];
  let bestDiff = Math.abs(best.date.getTime() - target);
  for (let i = 1; i < ma.length; i++) {
    const diff = Math.abs(ma[i].date.getTime() - target);
    if (diff < bestDiff) {
      best = ma[i];
      bestDiff = diff;
    }
  }
  return { value: best.value, date: best.date };
}

export type MetricStats = {
  latest: { value: number; date: Date } | null;
  sevenDayAvg: { value: number; count: number } | null;
  fourWeekDelta: { delta: number; start: number; end: number } | null;
  logged: { count: number; total: number; pct: number };
};

/** Range start in ms: now − rangeDays for fixed ranges; first point's day for 'all'. */
function rangeStart(series: MetricPoint[], range: TimeRange): number {
  const days = rangeDays(range);
  if (days != null) return Date.now() - days * DAY_MS;
  if (series.length === 0) return Date.now();
  return series[0].date.getTime();
}

function totalDaysInRange(series: MetricPoint[], range: TimeRange): number {
  const days = rangeDays(range);
  if (days != null) return days;
  if (series.length === 0) return 0;
  return Math.max(1, Math.round((Date.now() - series[0].date.getTime()) / DAY_MS) + 1);
}

export function computeStats(fullSeries: MetricPoint[], range: TimeRange): MetricStats {
  const startMs = rangeStart(fullSeries, range);
  const filtered = fullSeries.filter((p) => p.date.getTime() >= startMs);

  const latest = filtered.length > 0
    ? { value: filtered[filtered.length - 1].value, date: filtered[filtered.length - 1].date }
    : null;

  // 7-day avg: values in [today-6d, today]
  const sevenAgo = Date.now() - 6 * DAY_MS;
  const seen = new Set<string>();
  let sum = 0;
  for (const p of fullSeries) {
    if (p.date.getTime() < sevenAgo) continue;
    const k = dayKey(p.date);
    if (seen.has(k)) continue;
    seen.add(k);
    sum += p.value;
  }
  const sevenDayAvg = seen.size > 0 ? { value: sum / seen.size, count: seen.size } : null;

  // 4-week delta: MA at most recent vs MA ~28d earlier (anchored within the filtered range when possible)
  const ma = movingAverage(filtered, 7);
  let fourWeekDelta: MetricStats['fourWeekDelta'] = null;
  if (ma.length >= 2) {
    const end = ma[ma.length - 1];
    const targetStart = end.date.getTime() - 28 * DAY_MS;
    const start = maAt(ma, targetStart);
    if (start) {
      fourWeekDelta = { delta: end.value - start.value, start: start.value, end: end.value };
    }
  }

  const total = totalDaysInRange(fullSeries, range);
  const uniqueDays = new Set<string>();
  for (const p of filtered) uniqueDays.add(dayKey(p.date));
  const count = uniqueDays.size;
  const pct = total > 0 ? count / total : 0;

  return {
    latest,
    sevenDayAvg,
    fourWeekDelta,
    logged: { count, total, pct },
  };
}
