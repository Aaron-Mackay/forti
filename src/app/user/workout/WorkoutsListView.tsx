'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { WeekPrisma } from '@/types/dataTypes';
import CustomAppBar from "@/components/CustomAppBar";
import ProgressIcon from '@/lib/ProgressIcon';
import { getWorkoutStatus } from '@/lib/workoutProgress';

export default function WorkoutsListView({
  week,
  onBack,
  onSelectWorkout,
}: {
  week: WeekPrisma;
  onBack: () => void;
  onSelectWorkout: (workoutId: number) => void;
}) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <CustomAppBar title={`Week ${week.order}`} onBack={onBack} showBack />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Workouts
        </Typography>
        <List>
          {week.workouts.map((workout) => (
            <ListItem key={workout.id} disablePadding secondaryAction={
              <ProgressIcon status={getWorkoutStatus(workout)} />
            }>
              <ListItemButton onClick={() => onSelectWorkout(workout.id)}>
                <ListItemText primary={workout.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
}
