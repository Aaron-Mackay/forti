'use client';

import { format } from 'date-fns';
import { signalTokens } from '@lib/signal/tokens';
import type { TrackedMetric } from '@lib/metricSeries/metricCatalog';
import type { MetricPoint } from '@lib/metricSeries/extractSeries';
import { computeStats, movingAverage, type MetricStats } from '@lib/metricSeries/metricStats';
import { filterByTimeRange, TIME_RANGE_LABELS, type TimeRange } from '@lib/metricSeries/timeRange';
import { MetricChart } from './MetricChart';
import { RecentEntriesGrid } from './RecentEntriesGrid';

const palette = signalTokens.surface.planning;

function StatCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: signalTokens.fontVar.cond,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function statsCells(metric: TrackedMetric, stats: MetricStats) {
  const fmt = metric.formatter.full;
  const latest = stats.latest
    ? { value: fmt(stats.latest.value), hint: `${format(stats.latest.date, 'EEE dd')} · single log` }
    : { value: '—', hint: '' };

  const seven = stats.sevenDayAvg
    ? { value: fmt(stats.sevenDayAvg.value), hint: `from ${stats.sevenDayAvg.count} log${stats.sevenDayAvg.count === 1 ? '' : 's'} of 7` }
    : { value: '—', hint: 'no logs in last 7 days' };

  const delta = stats.fourWeekDelta
    ? {
        value: metric.formatter.delta(stats.fourWeekDelta.delta),
        hint: `${metric.formatter.bare(stats.fourWeekDelta.start)} → ${metric.formatter.bare(stats.fourWeekDelta.end)}`,
      }
    : { value: '—', hint: 'need 4+ weeks of data' };

  const logged = {
    value: `${stats.logged.count} / ${stats.logged.total}`,
    hint: `${Math.round(stats.logged.pct * 100)}% of days`,
  };

  return { latest, seven, delta, logged };
}

type Props = {
  metric: TrackedMetric;
  fullSeries: MetricPoint[];
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onBack?: () => void;
  onCellClick: (date: Date) => void;
};

export function MetricDetailPanel({ metric, fullSeries, range, onRangeChange, onBack, onCellClick }: Props) {
  const filtered = filterByTimeRange(fullSeries, range);
  const ma = movingAverage(filtered, 7);
  const stats = computeStats(fullSeries, range);
  const cells = statsCells(metric, stats);

  return (
    <div style={{ padding: '0px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            appearance: 'none',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            color: palette.inkLight,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
          }}
        >
          ← Metrics
        </button>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: signalTokens.fontVar.cond,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}
          >
            {metric.label}
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginTop: 3 }}>
            Daily logs · 7-day moving average ·{' '}
            {range === 'all' ? 'all time' : `last ${range === '12w' ? '12 weeks' : range === '6w' ? '6 weeks' : '4 weeks'}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {TIME_RANGE_LABELS.map(({ value, label }) => {
            const active = range === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onRangeChange(value)}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  padding: '3px 8px',
                  borderRadius: signalTokens.radii.cell,
                  border: `1px solid ${active ? palette.borderStrong : palette.border}`,
                  background: active ? palette.ink : 'transparent',
                  color: active ? palette.bg : palette.inkMid,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          overflow: 'hidden',
          marginTop: 4,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            padding: '16px 20px 0',
          }}
        >
          <StatCell label="Latest"  value={cells.latest.value} hint={cells.latest.hint} />
          <StatCell label="7-day avg" value={cells.seven.value} hint={cells.seven.hint} />
          <StatCell label="4-wk Δ"  value={cells.delta.value} hint={cells.delta.hint} />
          <StatCell label="Logged"  value={cells.logged.value} hint={cells.logged.hint} />
        </div>

        <MetricChart
          id={String(metric.key)}
          raw={filtered}
          movingAvg={ma}
          timeRange={range}
          formatValue={metric.formatter.full}
        />

        <div style={{ padding: '0 20px 18px' }}>
          <RecentEntriesGrid
            series={fullSeries}
            formatBare={metric.formatter.bare}
            unitHint={metric.formatter.unitHint}
            onCellClick={onCellClick}
          />
        </div>
      </div>
    </div>
  );
}
