'use client';

import React, {useEffect, useRef, useState} from 'react';
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
import {Swiper, SwiperSlide} from 'swiper/react';
import {Swiper as SwiperType} from 'swiper/types';
import {Pagination} from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
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
  const handleSetUpdate = (setIdx: number, field: Field, value: string) => {
    if (!(selectedWeekId && selectedWorkoutId && selectedExerciseId)) return;

    // Save previous state for possible revert
    const prevUserData = userDataState;

    // Find the current sets for the selected exercise
    const selectedWeek = userDataState.weeks.find((w) => w.id === selectedWeekId);
    const selectedWorkout = selectedWeek?.workouts.find((w) => w.id === selectedWorkoutId);
    const selectedExercise = selectedWorkout?.exercises.find((e) => e.id === selectedExerciseId);
    if (!selectedExercise) return;

    const updatedSets = selectedExercise.sets.map((set, idx) =>
      idx === setIdx ? {...set, [field]: field === 'weight' ? value : Number(value)} : set
    );

    // Optimistically update userDataState
    setUserData(prev =>
      updateUserSets(prev, selectedWeekId, selectedWorkoutId, selectedExerciseId, updatedSets)
    );

    // Fire PATCH request in background
    queueOrSendRequest(`/api/sets/${updatedSets[setIdx].id}`, 'PATCH', {
      [field]: field === 'reps' ? Number(value) : value
    } as SetUpdatePayload)
      .then(() => {
        setSnackbar({
          open: true,
          message: navigator.onLine ? 'Set updated' : 'Offline: update queued',
          severity: navigator.onLine ? 'success' : 'info',
        });
      })
      .catch(() => {
        setUserData(prevUserData);
        setSnackbar({
          open: true,
          message: 'Failed to update set',
          severity: 'info',
        });
      });
  };

  const handleSnackbarClose = () => {
    setSnackbar((s) => ({...s, open: false}));
  };

  const paginationRef = useRef<HTMLDivElement | null>(null);
  // Exercise Detail View (Swipeable)
  if (selectedExercise && selectedWorkout) {

    const handleSlideChange = (swiper: SwiperType) => {
      const newExercise = selectedWorkout.exercises[swiper.activeIndex];
      if (newExercise && newExercise.id !== selectedExerciseId) {
        setSelectedExerciseId(newExercise.id);
      }
    };

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="back" onClick={goBack} sx={{mr: 2}}>
              <ArrowBackIcon/>
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>
              {selectedExercise?.exercise.name}
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{
          py: 2, flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Swiper
            initialSlide={selectedWorkout.exercises.findIndex((e) => e.id === selectedExerciseId)}
            onSlideChange={handleSlideChange}
            modules={[Pagination]}
            pagination={{
              el: paginationRef.current,
              clickable: true,
            }}
            style={{
              flex: 1, display: 'flex',
              flexDirection: 'column', width: '100%'
            }}
          >
            {selectedWorkout.exercises.map((ex) => (
              <SwiperSlide key={ex.id}
                           style={{backgroundColor: "green", display: 'flex', flexDirection: 'column', height: '100%'}}>
                <Paper
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    p: 2,
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h4">{ex.exercise.name}</Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Sets
                  </Typography>
                  <List>
                    {ex.sets.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                        No sets recorded.
                      </Typography>
                    )}
                    {(ex.sets).map((set: SetPrisma, setIdx) => (
                      <ListItem key={set.id} disablePadding sx={{alignItems: 'flex-end', mb: 1}}>
                        <ListItemText
                          primary={`Set ${setIdx + 1}`}
                          sx={{minWidth: 60, flex: 'none', mr: 2}}
                        />
                        <TextField
                          label="Weight"
                          size="small"
                          value={set.weight ?? ''}
                          onChange={e =>
                            selectedExerciseId === ex.id &&
                            handleSetUpdate(setIdx, 'weight', e.target.value)
                          }
                          sx={{mr: 1, width: 100}}
                          disabled={selectedExerciseId !== ex.id}
                        />
                        <TextField
                          label="Reps"
                          type="text"
                          size="small"
                          value={set.reps ?? ''}
                          onChange={e =>
                            selectedExerciseId === ex.id &&
                            handleSetUpdate(setIdx, 'reps', e.target.value)
                          }
                          sx={{width: 80}}
                          slotProps={{
                            htmlInput: {inputMode: 'numeric',}
                          }}
                          disabled={selectedExerciseId !== ex.id}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {<Stopwatch/>}
                </Paper>
              </SwiperSlide>
            ))}
          </Swiper>
          <Box
            ref={paginationRef}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 48,
              mt: 1,
            }}
          />
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