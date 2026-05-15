export type TimeRange = '12w' | '6w' | '4w' | 'all';

export const TIME_RANGE_LABELS: { value: TimeRange; label: string }[] = [
  { value: '4w', label: '4w' },
  { value: '6w', label: '6w' },
  { value: '12w', label: '12w' },
  { value: 'all', label: 'All' },
];

const DAYS_BY_RANGE: Record<Exclude<TimeRange, 'all'>, number> = {
  '12w': 84,
  '6w': 42,
  '4w': 28,
};

export function rangeDays(range: TimeRange): number | null {
  return range === 'all' ? null : DAYS_BY_RANGE[range];
}

export function filterByTimeRange<T extends { date: Date | string | number }>(points: T[], range: TimeRange): T[] {
  if (range === 'all') return points;
  const cutoff = Date.now() - DAYS_BY_RANGE[range] * 86_400_000;
  return points.filter((p) => new Date(p.date).getTime() >= cutoff);
}
