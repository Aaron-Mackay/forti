'use client';

import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { signalTokens } from '@lib/signal/tokens';
import type { E1rmHistoryPoint } from '@lib/contracts/exerciseHistory';
import type { TrackedE1rmExercise } from '@/types/settingsTypes';
import type { WeightUnit } from '@/lib/units';
import { formatWeight } from '@/lib/units';

export type TimeRange = '12w' | '6w' | '4w' | 'all';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({ default: () => null })),
  { ssr: false },
);

const palette = signalTokens.surface.planning;

const TIME_RANGE_LABELS: { value: TimeRange; label: string }[] = [
  { value: '4w', label: '4w' },
  { value: '6w', label: '6w' },
  { value: '12w', label: '12w' },
  { value: 'all', label: 'All' },
];

export function filterByTimeRange(history: E1rmHistoryPoint[], range: TimeRange): E1rmHistoryPoint[] {
  if (range === 'all') return history;
  const days = { '12w': 84, '6w': 42, '4w': 28 }[range];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return history.filter((p) => new Date(p.date).getTime() >= cutoff);
}

function formatDelta(delta: number, unit: WeightUnit): { text: string; color: string } {
  if (Math.abs(delta) < 1) return { text: 'hold', color: palette.inkMid };
  const abs = Math.abs(delta);
  const formatted = formatWeight(abs, unit);
  if (delta > 0) return { text: `+${formatted}`, color: palette.ink };
  return { text: `−${formatted}`, color: signalTokens.status.urgent };
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  );
}

type Props = {
  exercise: TrackedE1rmExercise;
  history: E1rmHistoryPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onBack?: () => void;
  weightUnit: WeightUnit;
};

export function ExerciseDetailPanel({ exercise, history, timeRange, onTimeRangeChange, onBack, weightUnit }: Props) {
  const filtered = filterByTimeRange(history, timeRange);
  const first = filtered[0];
  const last = filtered.at(-1);

  const currentE1rm = last ? formatWeight(last.bestE1rm, weightUnit) : '—';
  const gain = first && last ? formatDelta(last.bestE1rm - first.bestE1rm, weightUnit) : null;
  const sessions = String(filtered.length);
  const bestPoint = filtered.reduce<E1rmHistoryPoint | null>(
    (acc, p) => (acc === null || p.bestE1rm > acc.bestE1rm ? p : acc),
    null,
  );
  const bestSet = bestPoint?.bestSet
    ? `${formatWeight(bestPoint.bestSet.weight, weightUnit)} × ${bestPoint.bestSet.reps}`
    : '—';

  const seriesData = filtered.map((p) => ({
    x: new Date(p.date).getTime(),
    y: parseFloat(p.bestE1rm.toFixed(1)),
  }));

  const lastIndex = seriesData.length - 1;
  const now = Date.now();

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
          ← Focus exercises
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {exercise.name}
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginTop: 3 }}>
            Estimated e1RM from logged sets
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {TIME_RANGE_LABELS.map(({ value, label }) => {
            const active = timeRange === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onTimeRangeChange(value)}
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
                  transition: 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.cardLarge, overflow: 'hidden', marginTop: 4 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            padding: '16px 20px 0px',
          }}
        >
          <StatCell label="Current e1RM" value={currentE1rm} />
          <StatCell label="Gain" value={gain ? gain.text : '—'} />
          <StatCell label="Sessions" value={sessions} />
          <StatCell label="Best set" value={bestSet} />
        </div>

        {seriesData.length > 0 ? (
          <Chart
            type="line"
            height={325}
            series={[{ name: 'Best e1RM', data: seriesData }]}
            options={{
              chart: {
                id: `e1rm-detail-${exercise.id}`,
                animations: { enabled: false },
                toolbar: { show: false },
                zoom: { enabled: false },
                selection: { enabled: false },
              },
              stroke: { curve: 'smooth', width: 2 },
              markers: {
                size: 4,
                discrete: lastIndex >= 0
                  ? [{
                      seriesIndex: 0,
                      dataPointIndex: lastIndex,
                      fillColor: signalTokens.signal.base,
                      strokeColor: signalTokens.signal.base,
                      size: 6,
                    }]
                  : [],
              },
              tooltip: {
                x: {
                  formatter: (_val: number, opts?: { dataPointIndex?: number }) => {
                    const pt = seriesData[opts?.dataPointIndex ?? 0];
                    return pt ? format(new Date(pt.x), 'dd MMM yyyy') : '';
                  },
                },
                y: {
                  formatter: (val: number, opts?: { dataPointIndex?: number }) => {
                    const point = filtered[opts?.dataPointIndex ?? 0];
                    const e1rm = formatWeight(val, weightUnit);
                    if (!point?.bestSet) return e1rm;
                    return `${e1rm}  ·  ${formatWeight(point.bestSet.weight, weightUnit)} × ${point.bestSet.reps}`;
                  },
                },
              },
              colors: [signalTokens.chart.series1],
              xaxis: {
                type: 'datetime',
                ...(timeRange !== 'all' && {
                  min: now - ({ '4w': 28, '6w': 42, '12w': 84 } as const)[timeRange] * 86400000,
                  max: now,
                  tickAmount: ({ '4w': 4, '6w': 3, '12w': 4 } as const)[timeRange],
                }),
                labels: {
                  style: { fontFamily: signalTokens.fontVar.mono, fontSize: '10px', colors: palette.inkLight },
                  formatter: (_val: string, timestamp?: number) => {
                    if (timestamp == null) return _val;
                    const weeksAgo = (now - timestamp) / (7 * 86400000);
                    if (weeksAgo < 0.5) return 'this week';
                    return `${Math.round(weeksAgo)}w ago`;
                  },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis: {
                forceNiceScale: true,
                decimalsInFloat: 0,
                labels: {
                  style: { fontFamily: signalTokens.fontVar.mono, fontSize: '10px', colors: palette.inkLight },
                  formatter: (v: number) => formatWeight(Math.round(v), weightUnit),
                },
              },
              grid: {
                borderColor: palette.border,
                padding: { left: 4, right: 12, top: 4, bottom: 0 },
              },
            }}
          />
        ) : (
          <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.6, padding: '20px' }}>
            No data in this time range.
          </div>
        )}
      </div>
    </div>
  );
}
