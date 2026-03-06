'use client';

import {Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Typography} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MuscleHighlight from '@/components/MuscleHighlight';
import {WorkoutPrisma} from '@/types/dataTypes';

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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {sx: {height: '85dvh', maxHeight: '85dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}},
      }}
    >
      <DialogTitle sx={{pb: 1}}>
        <Box sx={{display: 'flex', alignItems: 'flex-start'}}>
          <Box sx={{flex: 1}}>
            <Typography variant="h6" component="div">
              Workout complete!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ordinal(weekWorkoutsCompleted)} of {weekWorkoutsTotal} workouts done this week
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ml: 1, mt: -0.5}}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0, pt: 0}}
      >
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
        <Box sx={{flex: 1, minHeight: 0}}>
          <MuscleHighlight primaryMuscles={highlightedMuscles} exerciseId={workout.id} alwaysShow />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
