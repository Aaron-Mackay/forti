'use client';

import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import type { DayMetric } from '@prisma/client';
import { computeMetricSummary, formatSleepMins } from '@/types/checkInTypes';

interface Props {
  currentWeek: DayMetric[];
  weekPrior: DayMetric[];
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

export default function MetricsSummaryTable({ currentWeek, weekPrior }: Props) {
  const curr = computeMetricSummary(currentWeek);
  const prior = computeMetricSummary(weekPrior);

  const rows: { label: string; current: string; prior: string; dir: DeltaDir }[] = [
    {
      label: 'Avg Weight (kg)',
      current: curr.avgWeight !== null ? `${curr.avgWeight}` : '—',
      prior:   prior.avgWeight !== null ? `${prior.avgWeight}` : '—',
      dir: delta(curr.avgWeight, prior.avgWeight),
    },
    {
      label: 'Avg Steps',
      current: curr.avgSteps !== null ? curr.avgSteps.toLocaleString() : '—',
      prior:   prior.avgSteps !== null ? prior.avgSteps.toLocaleString() : '—',
      dir: delta(curr.avgSteps, prior.avgSteps),
    },
    {
      label: 'Avg Sleep',
      current: formatSleepMins(curr.avgSleepMins),
      prior:   formatSleepMins(prior.avgSleepMins),
      dir: delta(curr.avgSleepMins, prior.avgSleepMins),
    },
    {
      label: 'Avg Calories',
      current: curr.avgCalories !== null ? curr.avgCalories.toLocaleString() : '—',
      prior:   prior.avgCalories !== null ? prior.avgCalories.toLocaleString() : '—',
      dir: delta(curr.avgCalories, prior.avgCalories),
    },
    {
      label: 'Avg Protein (g)',
      current: curr.avgProtein !== null ? `${curr.avgProtein}` : '—',
      prior:   prior.avgProtein !== null ? `${prior.avgProtein}` : '—',
      dir: delta(curr.avgProtein, prior.avgProtein),
    },
    {
      label: 'Avg Carbs (g)',
      current: curr.avgCarbs !== null ? `${curr.avgCarbs}` : '—',
      prior:   prior.avgCarbs !== null ? `${prior.avgCarbs}` : '—',
      dir: delta(curr.avgCarbs, prior.avgCarbs),
    },
    {
      label: 'Avg Fat (g)',
      current: curr.avgFat !== null ? `${curr.avgFat}` : '—',
      prior:   prior.avgFat !== null ? `${prior.avgFat}` : '—',
      dir: delta(curr.avgFat, prior.avgFat),
    },
  ];

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Trend arrows compare this week vs previous week.
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Metric</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>This week</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Prior week</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, width: 40 }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.label}>
              <TableCell>{row.label}</TableCell>
              <TableCell align="right">{row.current}</TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.prior}</TableCell>
              <TableCell align="center"><DeltaIcon dir={row.dir} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
