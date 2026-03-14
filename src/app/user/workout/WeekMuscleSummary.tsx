'use client';

import { useInsertionEffect } from 'react';
import { Box, Typography } from '@mui/material';
import FrontBody from '@/components/front.svg';
import BackBody from '@/components/back.svg';
import { WeekPrisma, ExerciseMuscle, MUSCLE_NAMES } from '@/types/dataTypes';

function getBlueShade(doneSets: number): string {
  if (doneSets >= 7) return '#1e3a8a';
  if (doneSets >= 5) return '#1d4ed8';
  if (doneSets >= 3) return '#3b82f6';
  if (doneSets >= 1) return '#93c5fd';
  return '';
}

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
    drops.forEach((drop, idx) => {
      const weight = Math.pow(0.75, idx + 1);
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

  const targeted = (Object.entries(counts) as [ExerciseMuscle, { planned: number; done: number }][])
    .filter(([, { planned }]) => planned > 0)
    .sort(([, a], [, b]) => b.planned - a.planned);

  const css = targeted
    .map(([muscle, { done }]) => {
      const shade = getBlueShade(done);
      if (!shade) return '';
      return `#${id} [data-muscle="${muscle}"] { fill: ${shade} !important; }`;
    })
    .filter(Boolean)
    .join('\n');

  useInsertionEffect(() => {
    if (!css) return;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, [css]);

  if (targeted.length === 0) return null;

  const LEGEND = [
    { label: '1–2', color: '#93c5fd' },
    { label: '3–4', color: '#3b82f6' },
    { label: '5–6', color: '#1d4ed8' },
    { label: '7+',  color: '#1e3a8a' },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Muscle Coverage
      </Typography>

      {/* Body diagram */}
      <Box
        id={id}
        sx={{ display: 'flex', gap: 0.5, height: 130, justifyContent: 'center' }}
      >
        <FrontBody style={{ height: '100%', width: 'auto' }} />
        <BackBody style={{ height: '100%', width: 'auto' }} />
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Done sets:
        </Typography>
        {LEGEND.map(({ label, color }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Per-muscle done/planned list */}
      <Box sx={{ mt: 1.5 }}>
        {targeted.map(([muscle, { planned, done }]) => (
          <Box
            key={muscle}
            sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}
          >
            <Typography variant="body2">
              {MUSCLE_NAMES[muscle] ?? muscle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Number.isInteger(done) ? done : done.toFixed(1)} / {Number.isInteger(planned) ? planned : planned.toFixed(1)} sets
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
