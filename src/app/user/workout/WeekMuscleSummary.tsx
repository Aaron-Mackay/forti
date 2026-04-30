'use client';

import { useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MuscleBodyHeatmap from '@/components/MuscleBodyHeatmap';
import { WeekPrisma, ExerciseMuscle, MUSCLE_NAMES } from '@/types/dataTypes';

type MuscleCounts = Record<string, { planned: number; done: number }>;

/**
 * Computes effective set counts applying the drop set formula:
 * each regular set = 1, its 1st drop = 0.75, 2nd drop = 0.75², etc.
 */
function effectiveSets(sets: WeekPrisma['workouts'][number]['exercises'][number]['sets']): { planned: number; done: number } {
  const regularSets = sets.filter(s => !s.isDropSet);
  let planned = 0;
  let done = 0;
  for (const regular of regularSets) {
    planned += 1;
    if (regular.reps !== null && regular.reps > 0) done += 1;
    const drops = sets
      .filter(s => s.isDropSet && s.parentSetId === regular.id)
      .sort((a, b) => a.order - b.order);
    drops.forEach((drop, _idx) => {
      const weight = 0.5;
      planned += weight;
      if (drop.reps !== null && drop.reps > 0) done += weight;
    });
  }
  return { planned, done };
}

function computeMuscleCounts(week: WeekPrisma): MuscleCounts {
  const counts: MuscleCounts = {};

  for (const workout of week.workouts) {
    for (const ex of workout.exercises) {
      if (ex.exercise.category !== 'resistance') continue;
      const muscles = ex.exercise.primaryMuscles as string[];
      const { planned, done } = effectiveSets(ex.sets);
      for (const muscle of muscles) {
        if (!counts[muscle]) counts[muscle] = { planned: 0, done: 0 };
        counts[muscle].planned += planned;
        counts[muscle].done += done;
      }
    }
  }

  return counts;
}

export default function WeekMuscleSummary({ week }: { week: WeekPrisma }) {
  const counts = computeMuscleCounts(week);
  const id = `week-muscle-${week.id}`;
  const [modalOpen, setModalOpen] = useState(false);

  const targeted = (Object.entries(counts) as [ExerciseMuscle, { planned: number; done: number }][])
    .filter(([, { planned }]) => planned > 0)
    .sort(([, a], [, b]) => b.planned - a.planned);

  if (targeted.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Muscle Coverage
      </Typography>

      <MuscleBodyHeatmap
        id={id}
        values={Object.fromEntries(targeted.map(([muscle, { done }]) => [muscle, done]))}
        onClick={() => setModalOpen(true)}
        sx={{ display: 'flex', gap: 0.5, height: 195, justifyContent: 'center', cursor: 'pointer' }}
        bodyStyle={{ height: '100%', width: 'auto' }}
      />

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Muscle Coverage
          <IconButton onClick={() => setModalOpen(false)} size="small" edge="end" aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.25 }}>
            {targeted.map(([muscle, { planned, done }]) => (
              <Box
                key={muscle}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5, py: 0.25 }}
              >
                <Typography variant="body2" noWrap sx={{ mr: 0.5, minWidth: 0 }}>
                  {MUSCLE_NAMES[muscle] ?? muscle}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {Number.isInteger(done) ? done : done.toFixed(1)}/{Number.isInteger(planned) ? planned : planned.toFixed(1)}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
