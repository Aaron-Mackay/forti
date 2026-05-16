'use client';

import {Box, Chip} from '@mui/material';
import MuscleHighlight from '@/components/fitness/MuscleHighlight';
import {WorkoutPrisma} from '@/types/dataTypes';
import {Overlay} from '@/components/signal/overlay';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function muscleDisplayName(muscle: string): string {
  return muscle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function WorkoutCompletionModal({
  open,
  onClose,
  workout,
  weekWorkoutsCompleted,
  weekWorkoutsTotal,
}: {
  open: boolean;
  onClose: () => void;
  workout: WorkoutPrisma;
  weekWorkoutsCompleted: number;
  weekWorkoutsTotal: number;
}) {
  const muscleSetCounts = new Map<string, number>();
  for (const ex of workout.exercises) {
    const completedSets = ex.sets.filter(s => s.reps !== null && s.reps > 0).length;
    if (completedSets === 0) continue;
    for (const muscle of [...ex.exercise.primaryMuscles, ...ex.exercise.secondaryMuscles]) {
      muscleSetCounts.set(muscle, (muscleSetCounts.get(muscle) ?? 0) + completedSets);
    }
  }

  const muscleSummary = Array.from(muscleSetCounts.entries()).sort((a, b) => b[1] - a[1]);
  const highlightedMuscles = muscleSummary.map(([m]) => m);

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Workout complete!"
      eyebrow={`${ordinal(weekWorkoutsCompleted)} of ${weekWorkoutsTotal} workouts done this week`}
      size="md"
      height="tall"
    >
      <Box sx={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, pt: 1, pb: 1}}>
        {muscleSummary.length > 0 && (
          <Box sx={{flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1}}>
            {muscleSummary.map(([muscle, count]) => (
              <Chip
                key={muscle}
                label={`${muscleDisplayName(muscle)}: ${count} set${count !== 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        )}
        <Box
          data-testid="workout-completion-anatomy"
          sx={{height: {xs: 240, sm: 280}, minHeight: 240, width: '100%'}}
        >
          <MuscleHighlight primaryMuscles={highlightedMuscles} exerciseId={workout.id} alwaysShow />
        </Box>
      </Box>
    </Overlay>
  );
}
