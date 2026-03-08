'use client';

import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';
import {
  Box,
  Chip,
  Drawer,
  Skeleton,
  Typography,
} from '@mui/material';
import {Exercise} from '@prisma/client';
import {format} from 'date-fns';
import MuscleHighlight from '@/components/MuscleHighlight';
import type {E1rmHistoryPoint} from '@/app/api/exercises/[exerciseId]/e1rm-history/route';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({default: () => null})),
  {ssr: false, loading: () => <Skeleton variant="rounded" height={180}/>},
);

function toTitleCase(str: string) {
  return str.split(/[-\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function E1rmChart({exercise}: {exercise: Exercise}) {
  const [history, setHistory] = useState<E1rmHistoryPoint[] | null>(null);

  useEffect(() => {
    fetch(`/api/exercises/${exercise.id}/e1rm-history`)
      .then(r => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [exercise.id]);

  if (history === null) return <Skeleton variant="rounded" height={180}/>;

  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
        No workout history yet.
      </Typography>
    );
  }

  const series = [{name: 'Best e1RM', data: history.map(p => parseFloat(p.bestE1rm.toFixed(1)))}];
  const categories = history.map(p => format(new Date(p.date), 'dd MMM yy'));

  return (
    <Chart
      type="line"
      height={180}
      series={series}
      options={{
        chart: {
          id: `e1rm-chart-${exercise.id}`,
          toolbar: {show: false},
          animations: {enabled: false},
        },
        stroke: {curve: 'smooth', width: 2},
        markers: {size: 4},
        xaxis: {
          categories,
          labels: {rotate: -30, style: {fontSize: '11px'}},
          tickAmount: Math.min(history.length, 6),
        },
        colors: ['#1976d2'],
      }}
    />
  );
}

export default function ExerciseDetailDrawer({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      anchor="bottom"
      open={exercise !== null}
      onClose={onClose}
      PaperProps={{sx: {borderRadius: '16px 16px 0 0', maxHeight: '85dvh', overflowY: 'auto', p: 2}}}
    >
      {exercise && (
        <Box>
          {/* Drag handle */}
          <Box sx={{width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 2}}/>

          {/* Name */}
          <Typography variant="h6" sx={{mb: 1}}>
            {exercise.name}
          </Typography>

          {/* Muscle chips */}
          {exercise.primaryMuscles.length > 0 && (
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5}}>
              {exercise.primaryMuscles.map(m => (
                <Chip key={m} label={toTitleCase(m)} size="small" color="primary" variant="outlined" sx={{fontSize: '0.7rem'}}/>
              ))}
            </Box>
          )}
          {exercise.secondaryMuscles.length > 0 && (
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1}}>
              {exercise.secondaryMuscles.map(m => (
                <Chip key={m} label={toTitleCase(m)} size="small" color="warning" variant="outlined" sx={{fontSize: '0.7rem'}}/>
              ))}
            </Box>
          )}

          {/* Equipment chips */}
          {exercise.equipment.length > 0 && (
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2}}>
              {exercise.equipment.map(eq => (
                <Chip key={eq} label={toTitleCase(eq)} size="small" sx={{fontSize: '0.7rem'}}/>
              ))}
            </Box>
          )}

          {/* Anatomy */}
          {(exercise.primaryMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
            <Box sx={{height: 120, mb: 2}}>
              <MuscleHighlight
                primaryMuscles={exercise.primaryMuscles}
                secondaryMuscles={exercise.secondaryMuscles}
                exerciseId={exercise.id}
              />
            </Box>
          )}

          {/* E1RM history chart */}
          <Typography variant="subtitle2" sx={{mb: 0.5}}>
            Est. 1RM Progress
          </Typography>
          <E1rmChart exercise={exercise}/>
        </Box>
      )}
    </Drawer>
  );
}
