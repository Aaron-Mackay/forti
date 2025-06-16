'use client';

import {Box, Container, List, ListItem, ListItemButton, ListItemText, Typography} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import DashboardAppBar from './DashboardAppBar';
import {WorkoutPrisma} from '@/types/dataTypes';

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
    <Box sx={{minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary'}}>
      <DashboardAppBar title={workout.name} onBack={onBack} showBack/>
      <Container maxWidth="sm" sx={{py: 2}}>
        <Typography variant="subtitle1" gutterBottom>
          Exercises
        </Typography>
        <List>
          {workout.exercises.map((ex) => (
            <ListItem key={ex.id} disablePadding>
              <ListItemButton onClick={() => onSelectExercise(ex.id)} sx={{display: 'flex', alignItems: 'center'}}>
                <ListItemText
                  primary={ex.exercise.name}
                  sx={{flex: 1}}
                />
                <Box sx={{display: 'flex', alignItems: 'center', ml: 2}}>
                  {ex.sets.map((set, idx) => (
                    set.reps ? <TaskAltIcon key={idx}/> : <PanoramaFishEyeIcon key={idx}/>
                  ))}
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
}