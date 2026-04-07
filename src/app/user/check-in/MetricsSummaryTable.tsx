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
import type { DayMetric } from '@/generated/prisma/browser';
import { computeMetricSummary, formatSleepMins } from '@/types/checkInTypes';
import type { WeekTargets } from '@/types/checkInTypes';

interface Props {
  currentWeek: DayMetric[];
  weekPrior: DayMetric[];
  weekTargets: WeekTargets | null;
}

type DeltaDir = 'up' | 'down' | 'flat';

function delta(current: number | null, prior: number | null): DeltaDir {
  if (current === null || prior === null) return 'flat';
  const pct = Math.abs((current - prior) / prior);
  if (pct < 0.01) return 'flat';
  return current > prior ? 'up' : 'down';
}

function DeltaIcon({ dir }: { dir: DeltaDir }) {
  if (dir === 'up') return <ArrowUpwardIcon sx={{ fontSize: 14, color: 'success.main', verticalAlign: 'middle' }} />;
  if (dir === 'down') return <ArrowDownwardIcon sx={{ fontSize: 14, color: 'error.main', verticalAlign: 'middle' }} />;
  return <RemoveIcon sx={{ fontSize: 14, color: 'text.disabled', verticalAlign: 'middle' }} />;
}

function withTarget(value: string, target: string | null): string {
  return target !== null ? `${value}/${target}` : value;
}

export default function MetricsSummaryTable({ currentWeek, weekPrior, weekTargets }: Props) {
  const curr = computeMetricSummary(currentWeek);
  const prior = computeMetricSummary(weekPrior);

  const tgt = weekTargets;

  const rows: { label: string; current: string; prior: string; dir: DeltaDir; hasData: boolean }[] = [
    {
      label: 'Weight (kg)',
      current: curr.avgWeight !== null ? `${curr.avgWeight}` : '—',
      prior:   prior.avgWeight !== null ? `${prior.avgWeight}` : '—',
      dir: delta(curr.avgWeight, prior.avgWeight),
      hasData: curr.avgWeight !== null,
    },
    {
      label: 'Steps',
      current: withTarget(
        curr.avgSteps !== null ? Math.round(curr.avgSteps).toLocaleString() : '—',
        tgt?.stepsTarget != null ? tgt.stepsTarget.toLocaleString() : null,
      ),
      prior: prior.avgSteps !== null ? Math.round(prior.avgSteps).toLocaleString() : '—',
      dir: delta(curr.avgSteps, prior.avgSteps),
      hasData: curr.avgSteps !== null,
    },
    {
      label: 'Sleep',
      current: withTarget(
        formatSleepMins(curr.avgSleepMins),
        tgt?.sleepMinsTarget != null ? formatSleepMins(tgt.sleepMinsTarget) : null,
      ),
      prior: formatSleepMins(prior.avgSleepMins),
      dir: delta(curr.avgSleepMins, prior.avgSleepMins),
      hasData: curr.avgSleepMins !== null,
    },
    {
      label: 'Calories',
      current: withTarget(
        curr.avgCalories !== null ? Math.round(curr.avgCalories).toLocaleString() : '—',
        tgt?.caloriesTarget != null ? tgt.caloriesTarget.toLocaleString() : null,
      ),
      prior: prior.avgCalories !== null ? Math.round(prior.avgCalories).toLocaleString() : '—',
      dir: delta(curr.avgCalories, prior.avgCalories),
      hasData: curr.avgCalories !== null,
    },
    {
      label: 'Protein (g)',
      current: withTarget(
        curr.avgProtein !== null ? `${Math.round(curr.avgProtein)}` : '—',
        tgt?.proteinTarget != null ? `${tgt.proteinTarget}` : null,
      ),
      prior: prior.avgProtein !== null ? `${Math.round(prior.avgProtein)}` : '—',
      dir: delta(curr.avgProtein, prior.avgProtein),
      hasData: curr.avgProtein !== null,
    },
    {
      label: 'Carbs (g)',
      current: withTarget(
        curr.avgCarbs !== null ? `${Math.round(curr.avgCarbs)}` : '—',
        tgt?.carbsTarget != null ? `${tgt.carbsTarget}` : null,
      ),
      prior: prior.avgCarbs !== null ? `${Math.round(prior.avgCarbs)}` : '—',
      dir: delta(curr.avgCarbs, prior.avgCarbs),
      hasData: curr.avgCarbs !== null,
    },
    {
      label: 'Fat (g)',
      current: withTarget(
        curr.avgFat !== null ? `${Math.round(curr.avgFat)}` : '—',
        tgt?.fatTarget != null ? `${tgt.fatTarget}` : null,
      ),
      prior: prior.avgFat !== null ? `${Math.round(prior.avgFat)}` : '—',
      dir: delta(curr.avgFat, prior.avgFat),
      hasData: curr.avgFat !== null,
    },
  ];

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Metric (avg)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Prev</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Current/tgt</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.label}>
              <TableCell>{row.label}</TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.prior}</TableCell>
              <TableCell align="right">
                {row.current}{row.hasData && <> <DeltaIcon dir={row.dir} /></>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
