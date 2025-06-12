'use client';

import React, {useEffect, useState} from 'react';
import {
  Alert,
  AppBar,
  Box,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {queueOrSendRequest, syncQueuedRequests} from '@/utils/offlineSync';
import {updateUserSets} from '@/utils/updateUserSets';

import {SetPrisma, SetUpdatePayload, UserPrisma} from "@/types/dataTypes";
import Stopwatch from "@/components/Stopwatch";

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info';
};

type Field = 'weight' | 'reps';

export default function UserDashboardPage({userData}: { userData: UserPrisma }) {
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const [editingSets, setEditingSets] = useState<SetPrisma[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [userDataState, setUserData] = useState(userData);

  // remove body margin
  useEffect(() => {
    document.body.classList.add("no-body-margin");
    return () => {
      document.body.classList.remove("no-body-margin");
    };
  }, []);

  // Sync queued requests when coming online
  useEffect(() => {
    const sync = () => syncQueuedRequests();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  // When navigating to an exercise, initialize editingSets
  useEffect(() => {
    if (selectedExerciseId) {
      const exercise = userDataState.weeks
        .flatMap((w) => w.workouts)
        .flatMap((w) => w.exercises)
        .find((e) => e.id === selectedExerciseId);
      setEditingSets(exercise ? exercise.sets.map((set) => ({...set})) : []);
    }
  }, [selectedExerciseId, userDataState]);

  // Selectors
  const selectedWeek = userDataState.weeks.find((w) => w.id === selectedWeekId);
  const selectedWorkout = selectedWeek?.workouts.find((w) => w.id === selectedWorkoutId);
  const selectedExercise = selectedWorkout?.exercises.find((e) => e.id === selectedExerciseId);

  // Navigation handlers
  const goBack = () => {
    if (selectedExerciseId) setSelectedExerciseId(null);
    else if (selectedWorkoutId) setSelectedWorkoutId(null);
    else if (selectedWeekId) setSelectedWeekId(null);
  };

  // Handle set update (auto-save on change)
  const handleSetUpdate = async (setIdx: number, field: Field, value: string) => {
    const updatedSets = editingSets.map((set, idx) =>
      idx === setIdx ? {...set, [field]: field === 'weight' ? value : Number(value)} : set
    );
    setEditingSets(updatedSets);

    const setId = updatedSets[setIdx].id;
    const payload = {[field]: field === 'reps' ? Number(value) : value} as SetUpdatePayload;

    try {
      await queueOrSendRequest(`/api/sets/${setId}`, 'PATCH', payload);
      setSnackbar({
        open: true,
        message: navigator.onLine ? 'Set updated' : 'Offline: update queued',
        severity: navigator.onLine ? 'success' : 'info',
      });

      if (selectedWeekId && selectedWorkoutId && selectedExerciseId) {
        setUserData(prev =>
          updateUserSets(prev, selectedWeekId, selectedWorkoutId, selectedExerciseId, updatedSets)
        );
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to update set',
        severity: 'info',
      });
      // Optionally: revert optimistic update here if needed
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((s) => ({...s, open: false}));
  };

  // --- RENDERING ---

  // Exercise Detail View
  if (selectedExercise) {
    return (
      <Box sx={{minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary'}}>
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="back" onClick={goBack} sx={{mr: 2}}>
              <ArrowBackIcon/>
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
              {selectedExercise.exercise.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{py: 2}}>
          <Paper sx={{p: 2}}>
            <Typography variant="subtitle1" gutterBottom>
              Sets
            </Typography>
            <List>
              {editingSets.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                  No sets recorded.
                </Typography>
              )}
              {editingSets.map((set, idx) => (
                <ListItem key={set.id} disablePadding sx={{alignItems: 'flex-end', mb: 1}}>
                  <ListItemText
                    primary={`Set ${idx + 1}`}
                    sx={{minWidth: 60, flex: 'none', mr: 2}}
                  />
                  <TextField
                    label="Weight"
                    size="small"
                    value={set.weight ?? ''}
                    onChange={e => handleSetUpdate(idx, 'weight', e.target.value)}
                    sx={{mr: 1, width: 100}}
                  />
                  <TextField
                    label="Reps"
                    type="number"
                    size="small"
                    value={set.reps ?? ''}
                    onChange={e => handleSetUpdate(idx, 'reps', e.target.value)}
                    sx={{width: 80}}
                    slotProps={{
                      htmlInput: {inputMode: 'numeric', pattern: '[0-9.]*'}
                    }}
                  />
                </ListItem>
              ))}
            </List>
            <Stopwatch />
          </Paper>
        </Container>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={2500}
          onClose={handleSnackbarClose}
          anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{width: '100%'}}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // Workout Detail View
  if (selectedWorkout) {
    return (
      <Box sx={{minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary'}}>
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="back" onClick={goBack} sx={{mr: 2}}>
              <ArrowBackIcon/>
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
              {selectedWorkout.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{py: 2}}>
          <Typography variant="subtitle1" gutterBottom>
            Exercises
          </Typography>
          <List>
            {selectedWorkout.exercises.map((ex) => (
              <ListItem key={ex.id} disablePadding>
                <ListItemButton onClick={() => setSelectedExerciseId(ex.id)}>
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

  // Week Detail View
  if (selectedWeek) {
    return (
      <Box sx={{minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary'}}>
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="back" onClick={goBack} sx={{mr: 2}}>
              <ArrowBackIcon/>
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
              {`Week ${selectedWeek.order}`}
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{py: 2}}>
          <Typography variant="subtitle1" gutterBottom>
            Workouts
          </Typography>
          <List>
            {selectedWeek.workouts.map((workout) => (
              <ListItem key={workout.id} disablePadding>
                <ListItemButton onClick={() => setSelectedWorkoutId(workout.id)}>
                  <ListItemText primary={workout.name}/>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Container>
      </Box>
    );
  }

  // Weeks List (Dashboard Home)
  return (
    <Box sx={{minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary'}}>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
            {userDataState.name}&apos;s Dashboard
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{py: 2}}>
        <Typography variant="subtitle1" gutterBottom>
          Weeks
        </Typography>
        <List>
          {userDataState.weeks.map((week) => (
            <ListItem key={week.id} disablePadding>
              <ListItemButton onClick={() => setSelectedWeekId(week.id)}>
                <ListItemText primary={`Week ${week.order}`}/>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
}