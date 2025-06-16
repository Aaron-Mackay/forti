'use client';

import { Box, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import DashboardAppBar from './DashboardAppBar';
import { WorkoutPrisma } from '@/types/dataTypes';

export default function ExercisesListView({
  workout,
  onBack,
  onSelectExercise,
}: {
  workout: WorkoutPrisma;
  onBack: () => void;
  onSelectExercise: (exerciseId: number) => void;
}) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <DashboardAppBar title={workout.name} onBack={onBack} showBack />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Exercises
        </Typography>
        <List>
          {workout.exercises.map((ex) => (
            <ListItem key={ex.id} disablePadding>
              <ListItemButton onClick={() => onSelectExercise(ex.id)}>
                <ListItemText
                  primary={ex.exercise.name}
                  secondary={
                    ex.sets.length > 0
                      ? `${ex.sets.length} set${ex.sets.length > 1 ? 's' : ''}`
                      : 'No sets'
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
}