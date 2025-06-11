'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AppBar,
  Box,
  CircularProgress,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getWorkout } from '@lib/api';
import { queueOrSendRequest, syncQueuedRequests } from '@/utils/offlineSync';

interface Set {
  id: string;
  weight: number;
  reps: number;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
}

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info';
};

export default function WorkoutPage() {
  const { workoutId } = useParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [editingSets, setEditingSets] = useState<Set[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Sync queued requests when coming online
  useEffect(() => {
    const sync = () => syncQueuedRequests();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  useEffect(() => {
    setLoading(true);
    getWorkout(workoutId as string)
      .then((data) => setWorkout(data))
      .finally(() => setLoading(false));
  }, [workoutId]);

  // When navigating to an exercise, initialize editingSets
  useEffect(() => {
    if (selectedExerciseId && workout) {
      const exercise = workout.exercises.find(e => e.id === selectedExerciseId);
      setEditingSets(exercise ? exercise.sets.map(set => ({ ...set })) : []);
    }
  }, [selectedExerciseId, workout]);

// Handle set update (auto-save on blur/change)
  const handleSetUpdate = async (setIdx: number, field: 'weight' | 'reps', value: string) => {
    const updatedSets = editingSets.map((set, idx) =>
      idx === setIdx ? { ...set, [field]: Number(value) } : set
    );
    setEditingSets(updatedSets);

    const setId = updatedSets[setIdx].id;
    const payload = { [field]: field === 'reps' ? Number(value) : value };

    try {
      await queueOrSendRequest(
        `/api/sets/${setId}`,
        'PATCH',
        payload
      );
      setSnackbar({
        open: true,
        message: navigator.onLine ? 'Set updated' : 'Offline: update queued',
        severity: navigator.onLine ? 'success' : 'info',
      });
      // Optionally update workout state optimistically
      setWorkout(prev =>
        prev
          ? {
            ...prev,
            exercises: prev.exercises.map(ex =>
              ex.id === selectedExerciseId ? { ...ex, sets: updatedSets } : ex
            ),
          }
          : prev
      );
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to update set',
        severity: 'info',
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(s => ({ ...s, open: false }));
  };

  if (loading) {
    return (
      <Container sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" mt={2}>
          Loading workout...
        </Typography>
      </Container>
    );
  }

  if (!workout) {
    return (
      <Container sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          Workout not found
        </Typography>
      </Container>
    );
  }

  // Exercise detail view
  if (selectedExerciseId) {
    const exercise = workout.exercises.find(e => e.id === selectedExerciseId);
    if (!exercise) return null;
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="back"
              onClick={() => setSelectedExerciseId(null)}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {exercise.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{ py: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Sets
            </Typography>
            <List>
              {editingSets.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No sets recorded.
                </Typography>
              )}
              {editingSets.map((set, idx) => (
                <ListItem key={set.id} disablePadding sx={{ alignItems: 'flex-end', mb: 1 }}>
                  <ListItemText
                    primary={`Set ${idx + 1}`}
                    sx={{ minWidth: 60, flex: 'none', mr: 2 }}
                  />
                  <TextField
                    label="Weight"
                    size="small"
                    value={set.weight}
                    onChange={e => handleSetUpdate(idx, 'weight', e.target.value)}
                    sx={{ mr: 1, width: 100 }}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                  <TextField
                    label="Reps"
                    type="number"
                    size="small"
                    value={set.reps}
                    onChange={e => handleSetUpdate(idx, 'reps', e.target.value)}
                    sx={{ width: 80 }}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Container>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={2500}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // Workout overview view
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {workout.name}
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Exercises
        </Typography>
        <List>
          {workout.exercises.map((ex) => (
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
