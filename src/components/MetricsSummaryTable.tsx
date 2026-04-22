'use client';

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import type { Metric } from '@/generated/prisma/browser';
import { computeMetricSummary, formatSleepMins } from '@/types/checkInTypes';
import type { WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';

interface Props {
  currentWeek: Metric[];
  weekPrior: Metric[];
  weekTargets: WeekTargets | null;
  customMetricDefs?: CustomMetricDef[];
  forceCompactFont?: boolean;
}

type DeltaDir = 'up' | 'down' | 'flat';

function delta(current: number | null, prior: number | null, minPctChange = 0.01): DeltaDir {
  if (current === null || prior === null) return 'flat';
  const deltaValue = current - prior;
  if (deltaValue === 0) return 'flat';
  const scale = Math.abs(prior) > Number.EPSILON ? Math.abs(prior) : 1;
  const pct = Math.abs(deltaValue) / scale;
  if (pct < minPctChange) return 'flat';
  return deltaValue > 0 ? 'up' : 'down';
}

function DeltaIcon({ dir }: { dir: DeltaDir }) {
  if (dir === 'up') return <ArrowUpwardIcon sx={{ fontSize: 14, color: 'text.secondary', verticalAlign: 'middle' }} />;
  if (dir === 'down') return <ArrowDownwardIcon sx={{ fontSize: 14, color: 'text.secondary', verticalAlign: 'middle' }} />;
  return <RemoveIcon sx={{ fontSize: 14, color: 'text.disabled', verticalAlign: 'middle' }} />;
}

function avgCustom(metrics: Metric[], id: string): number | null {
  const vals: number[] = [];
  for (const m of metrics) {
    if (!m.customMetrics || typeof m.customMetrics !== 'object' || Array.isArray(m.customMetrics)) continue;
    const entry = (m.customMetrics as Record<string, unknown>)[id];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const v = (entry as Record<string, unknown>).value;
      if (typeof v === 'number') vals.push(v);
    }
  }
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

export default function MetricsSummaryTable({
  currentWeek,
  weekPrior,
  weekTargets,
  customMetricDefs = [],
  forceCompactFont = false,
}: Props) {
  const curr = computeMetricSummary(currentWeek);
  const prior = computeMetricSummary(weekPrior);
  const tgt = weekTargets;

  const rows: { label: string; current: string; target: string; prior: string; dir: DeltaDir; hasData: boolean }[] = [
    {
      label: 'Weight (kg)',
      current: curr.avgWeight !== null ? `${curr.avgWeight}` : '—',
      target: '—',
      prior:  prior.avgWeight !== null ? `${prior.avgWeight}` : '—',
      dir: delta(curr.avgWeight, prior.avgWeight, 0),
      hasData: curr.avgWeight !== null,
    },
    {
      label: 'Steps',
      current: curr.avgSteps !== null ? Math.round(curr.avgSteps).toLocaleString() : '—',
      target:  tgt?.stepsTarget != null ? tgt.stepsTarget.toLocaleString() : '—',
      prior:   prior.avgSteps !== null ? Math.round(prior.avgSteps).toLocaleString() : '—',
      dir: delta(curr.avgSteps, prior.avgSteps),
      hasData: curr.avgSteps !== null,
    },
    {
      label: 'Sleep',
      current: formatSleepMins(curr.avgSleepMins),
      target:  tgt?.sleepMinsTarget != null ? formatSleepMins(tgt.sleepMinsTarget) : '—',
      prior:   formatSleepMins(prior.avgSleepMins),
      dir: delta(curr.avgSleepMins, prior.avgSleepMins),
      hasData: curr.avgSleepMins !== null,
    },
    {
      label: 'Calories',
      current: curr.avgCalories !== null ? Math.round(curr.avgCalories).toLocaleString() : '—',
      target:  tgt?.caloriesTarget != null ? tgt.caloriesTarget.toLocaleString() : '—',
      prior:   prior.avgCalories !== null ? Math.round(prior.avgCalories).toLocaleString() : '—',
      dir: delta(curr.avgCalories, prior.avgCalories),
      hasData: curr.avgCalories !== null,
    },
    {
      label: 'Protein (g)',
      current: curr.avgProtein !== null ? `${Math.round(curr.avgProtein)}` : '—',
      target:  tgt?.proteinTarget != null ? `${tgt.proteinTarget}` : '—',
      prior:   prior.avgProtein !== null ? `${Math.round(prior.avgProtein)}` : '—',
      dir: delta(curr.avgProtein, prior.avgProtein),
      hasData: curr.avgProtein !== null,
    },
    {
      label: 'Carbs (g)',
      current: curr.avgCarbs !== null ? `${Math.round(curr.avgCarbs)}` : '—',
      target:  tgt?.carbsTarget != null ? `${tgt.carbsTarget}` : '—',
      prior:   prior.avgCarbs !== null ? `${Math.round(prior.avgCarbs)}` : '—',
      dir: delta(curr.avgCarbs, prior.avgCarbs),
      hasData: curr.avgCarbs !== null,
    },
    {
      label: 'Fat (g)',
      current: curr.avgFat !== null ? `${Math.round(curr.avgFat)}` : '—',
      target:  tgt?.fatTarget != null ? `${tgt.fatTarget}` : '—',
      prior:   prior.avgFat !== null ? `${Math.round(prior.avgFat)}` : '—',
      dir: delta(curr.avgFat, prior.avgFat),
      hasData: curr.avgFat !== null,
    },
    ...customMetricDefs.map(def => {
      const currVal = avgCustom(currentWeek, def.id);
      const priorVal = avgCustom(weekPrior, def.id);
      return {
        label: def.name,
        current: currVal !== null ? `${currVal}` : '—',
        target:  def.target != null ? `${def.target}` : '—',
        prior:   priorVal !== null ? `${priorVal}` : '—',
        dir: delta(currVal, priorVal),
        hasData: currVal !== null,
      };
    }),
  ];

  const cellSx = forceCompactFont
    ? { fontSize: '0.72rem' }
    : { fontSize: { xs: '0.72rem', lg: '0.875rem' } };

  return (
    <Box>
      <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, ...cellSx }}>Metric</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'text.secondary', ...cellSx }}>Prev</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'text.secondary', ...cellSx }}>Target</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600, ...cellSx }}>Avg</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.label}>
              <TableCell sx={{ whiteSpace: 'nowrap', ...cellSx }}>{row.label}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary', ...cellSx }}>{row.prior}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary', ...cellSx }}>{row.target}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', ...cellSx }}>
                {row.current}{row.hasData && <> <DeltaIcon dir={row.dir} /></>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
