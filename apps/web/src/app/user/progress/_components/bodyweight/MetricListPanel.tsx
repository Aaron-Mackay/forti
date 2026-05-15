'use client';

import { signalTokens } from '@lib/signal/tokens';
import type { TrackedMetric } from '@lib/metricSeries/metricCatalog';
import type { MetricPoint } from '@lib/metricSeries/extractSeries';
import type { MetricKey } from '@/types/metricTypes';
import { filterByTimeRange, type TimeRange } from '@lib/metricSeries/timeRange';
import { MetricRow } from './MetricRow';

const palette = signalTokens.surface.planning;

type Props = {
  tracked: TrackedMetric[];
  seriesByKey: Map<MetricKey, MetricPoint[]>;
  selectedKey: MetricKey | null;
  range: TimeRange;
  customMetricsAtCap: boolean;
  onSelect: (key: MetricKey) => void;
  onAddMetric: () => void;
};

export function MetricListPanel({
  tracked,
  seriesByKey,
  selectedKey,
  range,
  customMetricsAtCap,
  onSelect,
  onAddMetric,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px',
        }}
      >
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          Metrics
        </span>
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          {tracked.length} tracked
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          overflow: 'hidden',
        }}
      >
        {tracked.length === 0 ? (
          <div style={{ padding: '16px 16px 20px', fontSize: 13, color: palette.inkMid, lineHeight: 1.5 }}>
            Nothing logged yet. Add a metric, or log bodyweight from the calendar to see it here.
          </div>
        ) : (
          <div style={{ borderTop: `1px solid ${palette.border}` }}>
            {tracked.map((metric, i) => {
              const fullSeries = seriesByKey.get(metric.key) ?? [];
              const filtered = filterByTimeRange(fullSeries, range);
              return (
                <MetricRow
                  key={String(metric.key)}
                  metric={metric}
                  series={filtered}
                  selected={metric.key === selectedKey}
                  withTopBorder={i > 0}
                  onSelect={() => onSelect(metric.key)}
                />
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onAddMetric}
          disabled={customMetricsAtCap}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: 'none',
            borderTop: tracked.length > 0 ? `1px solid ${palette.border}` : 'none',
            cursor: customMetricsAtCap ? 'not-allowed' : 'pointer',
            padding: '12px 16px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            fontFamily: signalTokens.fontVar.body,
            fontSize: 13,
            color: customMetricsAtCap ? palette.inkLight : palette.inkMid,
          }}
        >
          {customMetricsAtCap ? 'Custom metric slots full (4 / 4)' : '+ Add a metric'}
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div
        style={{
          padding: '12px 14px',
          border: `1px dashed ${palette.border}`,
          borderRadius: signalTokens.radii.card,
          background: palette.bgAlt,
          marginTop: 4,
        }}
      >
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            color: palette.inkLight,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          How it counts
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.body, fontSize: 12, color: palette.inkMid, lineHeight: 1.5 }}>
          Missing days stay missing — averages and trends ignore blanks rather than treating them as zero.
        </div>
      </div>
    </div>
  );
}
