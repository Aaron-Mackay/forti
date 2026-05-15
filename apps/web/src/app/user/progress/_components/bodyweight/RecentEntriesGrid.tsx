'use client';

import { signalTokens } from '@lib/signal/tokens';
import type { MetricPoint } from '@lib/metricSeries/extractSeries';

const palette = signalTokens.surface.planning;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type Props = {
  series: MetricPoint[];
  formatBare: (value: number) => string;
  unitHint: string | null;
  onCellClick: (date: Date) => void;
};

export function RecentEntriesGrid({ series, formatBare, unitHint, onCellClick }: Props) {
  const today = startOfLocalDay(new Date());
  const byKey = new Map<string, number>();
  for (const p of series) {
    byKey.set(dayKey(p.date), p.value);
  }

  const cells: { date: Date; key: string; value: number | null; isToday: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const k = dayKey(d);
    const v = byKey.get(k);
    cells.push({ date: d, key: k, value: v ?? null, isToday: i === 0 });
  }

  const missing = cells.filter((c) => c.value == null && !c.isToday).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          Recent entries
        </span>
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          last 14 days · click to back-fill
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
          gap: 4,
        }}
      >
        {cells.map((c) => {
          const isEmpty = c.value == null;
          const isTodayEmpty = c.isToday && isEmpty;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onCellClick(c.date)}
              style={{
                appearance: 'none',
                cursor: 'pointer',
                border: `1px solid ${c.isToday ? palette.borderStrong : palette.border}`,
                borderRadius: signalTokens.radii.cell,
                background: c.isToday ? palette.surfaceAlt : palette.surface,
                padding: '6px 2px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minHeight: 56,
              }}
            >
              <span
                style={{
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 10,
                  color: palette.inkLight,
                }}
              >
                {String(c.date.getDate()).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontFamily: isTodayEmpty ? signalTokens.fontVar.mono : signalTokens.fontVar.cond,
                  fontSize: isTodayEmpty ? 10 : 14,
                  fontWeight: isTodayEmpty ? 400 : 700,
                  color: isEmpty
                    ? c.isToday
                      ? signalTokens.signal.deep
                      : palette.inkLight
                    : palette.ink,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}
              >
                {isTodayEmpty ? 'Log' : isEmpty ? '—' : formatBare(c.value as number)}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          {missing > 0 ? `${missing} day${missing === 1 ? '' : 's'} missing · blanks stay blank, not zero.` : 'All days logged.'}
        </span>
        <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          {unitHint ? `${unitHint} · ` : ''}open day to edit value
        </span>
      </div>
    </div>
  );
}
