'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
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
  editable?: boolean;
  onMetricChange?: (dayOffset: number, key: MetricBreakdownKey, value: number | null) => void;
}

type BuiltInMetricKey = 'weight' | 'steps' | 'sleepMins' | 'calories' | 'protein' | 'carbs' | 'fat';
export type MetricBreakdownKey = BuiltInMetricKey | `custom:${string}`;

function getCustomValue(metric: Metric, id: string): number | null {
  if (!metric.customMetrics || typeof metric.customMetrics !== 'object' || Array.isArray(metric.customMetrics)) return null;
  const entry = (metric.customMetrics as Record<string, unknown>)[id];
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const v = (entry as Record<string, unknown>).value;
    if (typeof v === 'number') return v;
  }
  return null;
}

function parseSleepMins(value: string): { h: string; m: string } {
  const total = value === '' ? null : Number(value);
  if (total === null || !Number.isFinite(total) || total < 0) return { h: '', m: '' };
  return { h: String(Math.floor(total / 60)), m: String(total % 60) };
}

function SleepCellInput({
  value,
  cellSx,
  onChange,
}: {
  value: string;
  cellSx: object;
  onChange: (total: number | null) => void;
}) {
  // editState overrides derived h/m while the user is actively editing a field.
  // When null, h/m derive directly from the value prop so external resets are reflected.
  const [editState, setEditState] = useState<{ h: string; m: string } | null>(null);
  const derived = parseSleepMins(value);
  const h = editState?.h ?? derived.h;
  const m = editState?.m ?? derived.m;

  function commit(newH: string, newM: string) {
    const hNum = newH.trim() === '' ? null : Number(newH);
    const mNum = newM.trim() === '' ? null : Number(newM);
    const total = hNum === null && mNum === null ? null : (hNum ?? 0) * 60 + (mNum ?? 0);
    onChange(total);
  }

  const inputSx = {
    '& .MuiInput-root': { pb: 0 },
    '& .MuiInputBase-input': { py: 0, textAlign: 'right', ...cellSx },
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '1px' }}>
      <TextField
        variant="standard"
        type="number"
        value={h}
        onChange={e => { const v = e.target.value; setEditState({ h: v, m }); commit(v, m); }}
        onBlur={() => setEditState(null)}
        sx={{ width: 20, ...inputSx }}
        slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
      />
      <Typography component="span" sx={{ ...cellSx, color: 'text.secondary' }}>h</Typography>
      <TextField
        variant="standard"
        type="number"
        value={m}
        onChange={e => { const v = e.target.value; setEditState({ h, m: v }); commit(h, v); }}
        onBlur={() => setEditState(null)}
        sx={{ width: 20, ...inputSx }}
        slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
      />
      <Typography component="span" sx={{ ...cellSx, color: 'text.secondary' }}>m</Typography>
    </Box>
  );
}

export default function MetricsDailyBreakdown({
  metrics,
  weekStartDate,
  customMetricDefs,
  showMetricColumn = true,
  includeEmptyRows = false,
  forceCompactFont = false,
  showRightFade = false,
  editable = false,
  onMetricChange,
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

  const stdRows: { label: string; key: MetricBreakdownKey; values: string[]; hasData: boolean }[] = [
    {
      label: 'Weight (kg)',
      key: 'weight',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.weight != null ? `${m.weight}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.weight != null),
    },
    {
      label: 'Steps',
      key: 'steps',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.steps != null ? m.steps.toLocaleString() : null)),
      hasData: Array.from(byOffset.values()).some(m => m.steps != null),
    },
    {
      label: 'Sleep',
      key: 'sleepMins',
      values: Array.from({ length: 7 }, (_, i) => {
        const m = byOffset.get(i);
        return m?.sleepMins != null ? formatSleepMins(m.sleepMins) : '—';
      }),
      hasData: Array.from(byOffset.values()).some(m => m.sleepMins != null),
    },
    {
      label: 'Calories',
      key: 'calories',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.calories != null ? m.calories.toLocaleString() : null)),
      hasData: Array.from(byOffset.values()).some(m => m.calories != null),
    },
    {
      label: 'Protein (g)',
      key: 'protein',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.protein != null ? `${m.protein}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.protein != null),
    },
    {
      label: 'Carbs (g)',
      key: 'carbs',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.carbs != null ? `${m.carbs}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.carbs != null),
    },
    {
      label: 'Fat (g)',
      key: 'fat',
      values: Array.from({ length: 7 }, (_, i) => val(i, m => m.fat != null ? `${m.fat}` : null)),
      hasData: Array.from(byOffset.values()).some(m => m.fat != null),
    },
  ];

  const customRows: { label: string; key: MetricBreakdownKey; values: string[]; hasData: boolean }[] = customMetricDefs.map(def => ({
    label: def.name,
    key: `custom:${def.id}`,
    values: Array.from({ length: 7 }, (_, i) => val(i, m => {
      const v = getCustomValue(m, def.id);
      return v != null ? `${v}` : null;
    })),
    hasData: Array.from(byOffset.values()).some(m => getCustomValue(m, def.id) != null),
  }));

  const rows = includeEmptyRows ? [...stdRows, ...customRows] : [...stdRows, ...customRows].filter(r => r.hasData);
  const initialDraftValues = useMemo(() => {
    const map = new Map<string, string>();
    const start = new Date(weekStartDate);
    rows.forEach(row => {
      row.values.forEach((value, dayOffset) => {
        if (row.key === 'sleepMins') {
          const metric = metrics.find(m => {
            const offset = Math.round((new Date(m.date).getTime() - start.getTime()) / 86400000);
            return offset === dayOffset;
          });
          map.set(`sleepMins:${dayOffset}`, metric?.sleepMins != null ? String(metric.sleepMins) : '');
          return;
        }
        map.set(`${row.key}:${dayOffset}`, value === '—' ? '' : value);
      });
    });
    return map;
  }, [metrics, rows, weekStartDate]);
  const [draftValues, setDraftValues] = useState<Map<string, string>>(initialDraftValues);

  useEffect(() => {
    updateFades();
  }, [rows.length, showMetricColumn, updateFades]);
  // Sync draft values when source data changes. Intentionally depends on the source
  // props rather than the derived initialDraftValues Map, which has a new reference
  // on every render (rows is computed inline) and would cause an infinite loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDraftValues(initialDraftValues); }, [metrics, customMetricDefs, weekStartDate, includeEmptyRows]);

  if (rows.length === 0) return null;

  const cellSx = forceCompactFont
    ? { fontSize: '0.72rem' }
    : { fontSize: { xs: '0.72rem', lg: '0.875rem' } };
  const dayColumnWidth = showMetricColumn ? `${100 / (dayLabels.length + 1)}%` : `${100 / dayLabels.length}%`;
  const stickyMetricCellSx = showMetricColumn
    ? {
      ...cellSx,
      width: 'max-content',
      minWidth: 'max-content',
      whiteSpace: 'nowrap',
      position: 'sticky' as const,
      left: 0,
      zIndex: 2,
      bgcolor: 'background.paper',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: -12,
        width: 12,
        height: '100%',
        pointerEvents: 'none',
        background: (theme: { palette: { background: { paper: string } } }) =>
          `linear-gradient(to right, ${theme.palette.background.paper}, rgba(0,0,0,0))`,
      },
    }
    : cellSx;
  const stickyMetricHeaderSx = showMetricColumn
    ? { ...stickyMetricCellSx, zIndex: 3, fontWeight: 600 }
    : { fontWeight: 600, ...cellSx };

  return (
    <Box sx={{ position: 'relative', minWidth: 0 }}>
      <Box ref={scrollRef} sx={{ overflowX: 'auto' }} onScroll={handleScroll}>
        <Table size="small" sx={{ width: '100%', '& .MuiTableCell-root': { px: 1 } }}>
          <TableHead>
            <TableRow>
              {showMetricColumn && <TableCell sx={stickyMetricHeaderSx}>Metric</TableCell>}
              {dayLabels.map(label => (
                <TableCell key={label} align="center" sx={{ width: dayColumnWidth, fontWeight: 600, ...cellSx }}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.label}>
                {showMetricColumn && <TableCell sx={stickyMetricCellSx}>{row.label}</TableCell>}
                {row.values.map((v, i) => (
                  <TableCell key={i} align="center" sx={{ width: dayColumnWidth, color: v === '—' ? 'text.disabled' : 'inherit', ...cellSx }}>
                    {editable && row.key === 'sleepMins' ? (
                      <SleepCellInput
                        value={draftValues.get(`sleepMins:${i}`) ?? ''}
                        cellSx={cellSx}
                        onChange={total => {
                          setDraftValues(prev => {
                            const next = new Map(prev);
                            next.set(`sleepMins:${i}`, total !== null ? String(total) : '');
                            return next;
                          });
                          onMetricChange?.(i, 'sleepMins', total);
                        }}
                      />
                    ) : editable ? (
                      <TextField
                        variant="standard"
                        type="number"
                        value={draftValues.get(`${row.key}:${i}`) ?? ''}
                        sx={{ '& .MuiInput-root': { pb: 0 }, '& .MuiInputBase-input': { py: 0, textAlign: 'center', ...cellSx } }}
                        onChange={e => {
                          const raw = e.target.value;
                          setDraftValues(prev => {
                            const next = new Map(prev);
                            next.set(`${row.key}:${i}`, raw);
                            return next;
                          });
                          const trimmed = raw.trim();
                          if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') return;
                          const next = Number(trimmed);
                          if (Number.isFinite(next)) {
                            onMetricChange?.(i, row.key, next);
                          }
                        }}
                        onBlur={e => {
                          const raw = e.target.value;
                          const trimmed = raw.trim();
                          if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
                            setDraftValues(prev => {
                              const next = new Map(prev);
                              next.set(`${row.key}:${i}`, '');
                              return next;
                            });
                            onMetricChange?.(i, row.key, null);
                            return;
                          }
                          const next = raw === '' ? null : Number(raw);
                          if (next === null || Number.isFinite(next)) {
                            onMetricChange?.(i, row.key, next);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        inputProps={{ inputMode: 'decimal' }}
                        fullWidth
                      />
                    ) : (
                      v
                    )}
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
