'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { WeekPrisma } from '@/types/dataTypes';
import { useAppBar } from '@lib/providers/AppBarProvider';
import ProgressIcon from '@/lib/ProgressIcon';
import { getWorkoutStatus } from '@/lib/workoutProgress';
import WeekMuscleSummary from './WeekMuscleSummary';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';

export default function WorkoutsListView({
  week,
  onBack,
  onSelectWorkout,
}: {
  week: WeekPrisma;
  onBack: () => void;
  onSelectWorkout: (workoutId: number) => void;
}) {
  useAppBar({ title: `Week ${week.order}`, showBack: true, onBack });
  return (
    <Box sx={{ maxHeight: HEIGHT_EXC_APPBAR, bgcolor: 'background.default', color: 'text.primary' }}>
      <Container sx={{ pt: 1 }}>
        <WeekMuscleSummary week={week} />
        <Typography variant="subtitle1" gutterBottom>
          Workouts
        </Typography>
        <List>
          {week.workouts.map((workout) => {
            const setCount = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            return (
              <ListItem key={workout.id} disablePadding secondaryAction={
                <ProgressIcon status={getWorkoutStatus(workout)} />
              }>
                <ListItemButton onClick={() => onSelectWorkout(workout.id)}>
                  <Box>
                    <ListItemText primary={workout.name} sx={{m: 0}} />
                    <Typography variant="caption" color="text.secondary">
                      {setCount} sets
                    </Typography>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Container>
    </Box>
  );
}
