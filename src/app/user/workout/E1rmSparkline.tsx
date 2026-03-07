'use client';

import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';
import {Box, Skeleton, Typography} from '@mui/material';
import {format} from 'date-fns';
import type {E1rmHistoryPoint} from '@/app/api/exercises/[exerciseId]/e1rm-history/route';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({default: () => null})),
  {ssr: false, loading: () => <Skeleton variant="rounded" height={80}/>},
);

export default function E1rmSparkline({
  exerciseId,
  currentWorkoutId,
}: {
  exerciseId: number;
  currentWorkoutId: number;
}) {
  const [history, setHistory] = useState<E1rmHistoryPoint[] | null>(null);

  useEffect(() => {
    fetch(`/api/exercises/${exerciseId}/e1rm-history?currentWorkoutId=${currentWorkoutId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [exerciseId, currentWorkoutId]);

  if (history === null) return <Skeleton variant="rounded" height={80} sx={{mb: 1}}/>;
  const valid = history.filter(p => typeof p.bestE1rm === 'number');
  if (valid.length === 0) return null;

  const series = [{name: 'Best e1RM', data: valid.map(p => parseFloat(p.bestE1rm.toFixed(1)))}];
  const categories = valid.map(p => format(new Date(p.date), 'dd MMM'));
  const latest = valid[valid.length - 1].bestE1rm;

  return (
    <Box sx={{width: '100%', mb: 1}}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5}}>
        <Typography variant="caption" color="text.secondary">
          Est. 1RM history
        </Typography>
        <Typography variant="caption" color="primary" fontWeight={600}>
          Best: {latest.toFixed(1)} kg
        </Typography>
      </Box>
      <Chart
        type="line"
        height={80}
        series={series}
        options={{
          chart: {
            id: `e1rm-sparkline-${exerciseId}`,
            sparkline: {enabled: true},
            animations: {enabled: false},
            toolbar: {show: false},
          },
          stroke: {curve: 'smooth', width: 2},
          markers: {size: 3},
          tooltip: {
            x: {formatter: (_v, {dataPointIndex}) => categories[dataPointIndex] ?? ''},
            y: {formatter: v => `${v} kg`},
          },
          colors: ['#1976d2'],
          xaxis: {categories},
        }}
      />
    </Box>
  );
}
