'use client';

import { signalTokens } from '@lib/signal/tokens';
import type { TrackedMetric } from '@lib/metricSeries/metricCatalog';
import type { MetricPoint } from '@lib/metricSeries/extractSeries';
import { MetricSparkline } from './MetricSparkline';

const palette = signalTokens.surface.planning;

type Props = {
  metric: TrackedMetric;
  series: MetricPoint[];
  selected: boolean;
  withTopBorder: boolean;
  onSelect: () => void;
};

export function MetricRow({ metric, series, selected, withTopBorder, onSelect }: Props) {
  const last = series.at(-1);
  const first = series[0];
  const delta = first && last && first !== last ? metric.formatter.delta(last.value - first.value) : null;
  const deltaColor =
    delta == null || delta === 'hold'
      ? palette.inkMid
      : delta.startsWith('−')
      ? signalTokens.status.urgent
      : palette.ink;

  const sparkData = series.map((p) => ({ x: p.date.getTime(), y: Number(p.value.toFixed(2)) }));
  const currentDisplay = last ? metric.formatter.full(last.value) : '—';

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        appearance: 'none',
        background: selected ? palette.surfaceAlt : palette.surface,
        border: 'none',
        borderTop: withTopBorder ? `1px solid ${palette.border}` : 'none',
        borderLeft: `3px solid ${selected ? signalTokens.signal.base : 'transparent'}`,
        cursor: 'pointer',
        padding: '14px 16px',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: signalTokens.fontVar.body,
            fontSize: 15,
            fontWeight: 600,
            color: palette.ink,
            lineHeight: 1.2,
          }}
        >
          {metric.label}
        </div>
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            color: deltaColor,
            marginTop: 3,
          }}
        >
          {delta ?? (last ? 'first log' : 'no data')}
        </div>
      </div>
      <div
        style={{
          fontFamily: signalTokens.fontVar.cond,
          fontSize: 18,
          fontWeight: 700,
          color: palette.ink,
          minWidth: 70,
          textAlign: 'right',
          letterSpacing: '-0.01em',
        }}
      >
        {currentDisplay}
      </div>
      <MetricSparkline id={String(metric.key)} data={sparkData} />
    </button>
  );
}
