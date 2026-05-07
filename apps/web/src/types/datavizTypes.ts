import type { BuiltInMetricKey } from './metricTypes';

export type { BuiltInMetricKey };

export type RelativeWeeks = 1 | 2 | 4 | 8 | 12 | 26 | 52;
export const RELATIVE_WEEK_OPTIONS: RelativeWeeks[] = [1, 2, 4, 8, 12, 26, 52];

export type DataVizTimeRange =
  | { mode: 'relative'; weeks: RelativeWeeks }
  | { mode: 'absolute'; startDate: string; endDate: string }; // ISO YYYY-MM-DD

export interface DataVizCard {
  kind: 'dataviz';
  id: string;
  metric: BuiltInMetricKey;
  timeRange: DataVizTimeRange;
  title?: string;
  columnSpan: 1 | 2;
}
