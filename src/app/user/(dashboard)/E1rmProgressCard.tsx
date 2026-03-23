'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Box, Card, CardContent, Divider, IconButton, Skeleton, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { format } from 'date-fns';
import type { E1rmHistoryPoint } from '@/app/api/exercises/[exerciseId]/e1rm-history/route';
import type { TrackedE1rmExercise } from '@/types/settingsTypes';
import type { WeightUnit } from '@/lib/units';
import { formatWeight } from '@/lib/units';
import { PRIMARY_COLOUR } from '@lib/theme';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({ default: () => null })),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={60} /> },
);

function ExerciseRow({ exercise, weightUnit }: { exercise: TrackedE1rmExercise; weightUnit: WeightUnit }) {
  const [history, setHistory] = useState<E1rmHistoryPoint[] | null>(null);

  useEffect(() => {
    fetch(`/api/exercises/${exercise.id}/e1rm-history`)
      .then(res => (res.ok ? res.json() : Promise.resolve([])))
      .then((data: E1rmHistoryPoint[]) => setHistory(data))
      .catch(() => setHistory([]));
  }, [exercise.id]);

  if (history === null) {
    return (
      <Box>
        <Skeleton variant="text" width={120} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={180} sx={{ mb: 0.5 }} />
        <Skeleton variant="rounded" height={60} />
      </Box>
    );
  }

  if (history.length === 0) {
    return (
      <Box>
        <Typography variant="subtitle2">{exercise.name}</Typography>
        <Typography variant="body2" color="text.secondary">No data yet — log a workout set to start tracking.</Typography>
      </Box>
    );
  }

  const mostRecent = history[history.length - 1].bestE1rm;
  const allTimeBest = Math.max(...history.map(p => p.bestE1rm));

  const seriesData = history.map(p => parseFloat(p.bestE1rm.toFixed(1)));
  const categories = history.map(p => format(new Date(p.date), 'dd MMM'));

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{exercise.name}</Typography>
      <Box sx={{ display: 'flex', gap: 3, mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Recent:{' '}
          <Typography component="span" variant="body2" fontWeight={600}>
            {formatWeight(mostRecent, weightUnit)}
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Best:{' '}
          <Typography component="span" variant="body2" fontWeight={600}>
            {formatWeight(allTimeBest, weightUnit)}
          </Typography>
        </Typography>
      </Box>
      <Chart
        type="line"
        height={60}
        series={[{ name: 'Best e1RM', data: seriesData }]}
        options={{
          chart: {
            id: `e1rm-dash-${exercise.id}`,
            animations: { enabled: false },
            toolbar: { show: false },
            zoom: { enabled: false },
            selection: { enabled: false },
          },
          stroke: { curve: 'smooth', width: 2 },
          markers: { size: 0 },
          tooltip: {
            x: { formatter: (_v: number, { dataPointIndex }: { dataPointIndex: number }) => categories[dataPointIndex] ?? '' },
          },
          colors: [PRIMARY_COLOUR],
          xaxis: {
            categories,
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
          },
          yaxis: { labels: { show: false } },
          grid: { show: false, padding: { left: 0, right: 8, top: 0, bottom: 0 } },
        }}
      />
    </Box>
  );
}

export default function E1rmProgressCard({
  exercises,
  weightUnit,
}: {
  exercises: TrackedE1rmExercise[];
  weightUnit: WeightUnit;
}) {
  if (exercises.length === 0) return null;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" component="h2">E1RM Progress</Typography>
          <IconButton
            component={Link}
            href="/user/settings"
            size="small"
            aria-label="Edit tracked exercises in settings"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>
        {exercises.map((exercise, i) => (
          <Box key={exercise.id}>
            {i > 0 && <Divider sx={{ my: 1.5 }} />}
            <ExerciseRow exercise={exercise} weightUnit={weightUnit} />
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
