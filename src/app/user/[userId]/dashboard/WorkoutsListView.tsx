'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import DashboardAppBar from './DashboardAppBar';
import { WeekPrisma } from '@/types/dataTypes';

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
      <DashboardAppBar title={`Week ${week.order}`} onBack={onBack} showBack />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Workouts
        </Typography>
        <List>
          {week.workouts.map((workout) => (
            <ListItem key={workout.id} disablePadding>
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