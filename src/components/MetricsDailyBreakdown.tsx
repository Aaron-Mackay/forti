'use client';

import { useEffect } from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import type { Metric } from '@/generated/prisma/browser';
import { formatSleepMins } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';
import ScrollEdgeFades from './ScrollEdgeFades';
import { useScrollEdgeFades } from '@lib/hooks/useScrollEdgeFades';

interface Props {
  metrics: Metric[];
  weekStartDate: string | Date;
  customMetricDefs: CustomMetricDef[];
  showMetricColumn?: boolean;
  includeEmptyRows?: boolean;
  forceCompactFont?: boolean;
  showRightFade?: boolean;
}

function getCustomValue(metric: Metric, id: string): number | null {
  if (!metric.customMetrics || typeof metric.customMetrics !== 'object' || Array.isArray(metric.customMetrics)) return null;
  const entry = (metric.customMetrics as Record<string, unknown>)[id];
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const v = (entry as Record<string, unknown>).value;
    if (typeof v === 'number') return v;
  }
  return null;
}

export default function MetricsDailyBreakdown({
  metrics,
  weekStartDate,
  customMetricDefs,
  showMetricColumn = true,
  includeEmptyRows = false,
  forceCompactFont = false,
  showRightFade = false,
}: Props) {
  const {
    scrollRef,
    handleScroll,
    showStartFade,
    showEndFade,
    updateFades,
  } = useScrollEdgeFades<HTMLDivElement>({ axis: 'x', enabled: showRightFade });

  const weekStart = new Date(weekStartDate);

  // Map dayOffset (0–6) → Metric. Both weekStartDate and m.date are UTC midnight @db.Date values.
  const byOffset = new Map<number, Metric>();
  for (const m of metrics) {
    const offset = Math.round((new Date(m.date).getTime() - weekStart.getTime()) / 86400000);
    if (offset >= 0 && offset <= 6) byOffset.set(offset, m);
  }

  // Day header labels derived from weekStart using UTC to avoid timezone-day mismatch
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  });

  function val(i: number, fn: (m: Metric) => string | null): string {
    const m = byOffset.get(i);
    return m ? (fn(m) ?? '—') : '—';
  }

  const stdRows: { label: string; values: string[]; hasData: boolean }[] = [
    {
      label: 'Weight (kg)',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.weight != null ? `${m.weight}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.weight != null),
    },
    {
      label: 'Steps',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.steps != null ? m.steps.toLocaleString() : null)),
      hasData: Array.from(byOffset.values()).some(m => m.steps != null),
    },
    {
      label: 'Sleep',
      values: Array.from({ length: 7 }, (_, i) => {
        const m = byOffset.get(i);
        return m?.sleepMins != null ? formatSleepMins(m.sleepMins) : '—';
      }),
      hasData: Array.from(byOffset.values()).some(m => m.sleepMins != null),
    },
    {
      label: 'Calories',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.calories != null ? m.calories.toLocaleString() : null)),
      hasData: Array.from(byOffset.values()).some(m => m.calories != null),
    },
    {
      label: 'Protein (g)',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.protein != null ? `${m.protein}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.protein != null),
    },
    {
      label: 'Carbs (g)',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.carbs != null ? `${m.carbs}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.carbs != null),
    },
    {
      label: 'Fat (g)',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.fat != null ? `${m.fat}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.fat != null),
    },
  ];

  const customRows = customMetricDefs.map(def => ({
    label: def.name,
    values: Array.from({ length: 7 }, (_, i) => val(i, m => {
      const v = getCustomValue(m, def.id);
      return v != null ? `${v}` : null;
    })),
    hasData: Array.from(byOffset.values()).some(m => getCustomValue(m, def.id) != null),
  }));

  const rows = includeEmptyRows ? [...stdRows, ...customRows] : [...stdRows, ...customRows].filter(r => r.hasData);
  useEffect(() => {
    updateFades();
  }, [rows.length, showMetricColumn, updateFades]);

  if (rows.length === 0) return null;

  const cellSx = forceCompactFont
    ? { fontSize: '0.72rem' }
    : { fontSize: { xs: '0.72rem', lg: '0.875rem' } };

  return (
    <Box sx={{ position: 'relative', minWidth: 0 }}>
      <Box ref={scrollRef} sx={{ overflowX: 'auto' }} onScroll={handleScroll}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {showMetricColumn && <TableCell sx={{ fontWeight: 600, ...cellSx }}>Metric</TableCell>}
              {dayLabels.map(label => (
                <TableCell key={label} align="center" sx={{ fontWeight: 600, ...cellSx }}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.label}>
                {showMetricColumn && <TableCell sx={cellSx}>{row.label}</TableCell>}
                {row.values.map((v, i) => (
                  <TableCell key={i} align="center" sx={{ color: v === '—' ? 'text.disabled' : 'inherit', ...cellSx }}>
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {showRightFade && <ScrollEdgeFades axis="x" showStart={showStartFade} showEnd={showEndFade} size={18} background="paper" />}
    </Box>
  );
}
