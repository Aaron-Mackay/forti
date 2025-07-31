'use client';

import React, {useRef} from 'react';
import {
  Alert,
  Box,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {Swiper, SwiperSlide} from 'swiper/react';
import {Pagination} from 'swiper/modules';
import {Swiper as SwiperType} from 'swiper/types';
import 'swiper/css';
import 'swiper/css/pagination';
import './styles.css';
import {SetPrisma, WorkoutPrisma} from '@/types/dataTypes';
import Stopwatch from "./Stopwatch";
import CustomAppBar from "@/components/CustomAppBar";

export default function ExerciseDetailView({
                                             workout,
                                             activeExerciseId,
                                             onBack,
                                             onSlideChange,
                                             handleSetUpdate,
                                             snackbar,
                                             handleSnackbarClose,
                                             stopwatchIsRunning,
                                             stopwatchStartTimestamp,
                                             stopwatchPausedTime,
                                             onStopwatchStartStop,
                                             onStopwatchReset,
                                           }: {
  workout: WorkoutPrisma;
  activeExerciseId: number;
  onBack: () => void;
  onSlideChange: (swiper: SwiperType) => void;
  handleSetUpdate: (setIdx: number, field: 'weight' | 'reps', value: string) => void;
  snackbar: { open: boolean; message: string; severity: 'success' | 'info' };
  handleSnackbarClose: () => void;
  stopwatchIsRunning: boolean;
  stopwatchStartTimestamp: number | null;
  stopwatchPausedTime: number;
  onStopwatchStartStop: () => void;
  onStopwatchReset: () => void;
}) {
  const paginationRef = useRef<HTMLDivElement | null>(null);

  return (
    <Box sx={{
      minHeight: '100dvh',
      bgcolor: 'background.default',
      color: 'text.primary',
      display: 'flex',
      flexDirection: 'column',
      height: "100dvh"
    }}>
      <CustomAppBar title="Exercises" onBack={onBack} showBack/>
      <Container
        maxWidth="sm"
        sx={{
          py: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <Swiper
          initialSlide={workout.exercises.findIndex((e) => e.id === activeExerciseId)}
          onSlideChange={onSlideChange}
          modules={[Pagination]}
          pagination={{
            el: '.custom-swiper-pagination',
            clickable: true,
            type: 'bullets',
            renderBullet: function (index, className) {
              return '<span class="' + className + '">' + (index + 1) + '</span>';
            },
          }}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          {workout.exercises.map((ex) => (
            <SwiperSlide key={ex.id} style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
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
                <Typography variant="h6" align="center">
                  {ex.exercise.name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', m: 1, width: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Rest: {ex.restTime}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Reps: {ex.repRange}
                </Typography>
                </Box>
                <List>
                  {ex.sets.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                      No sets recorded.
                    </Typography>
                  )}
                  {ex.sets.map((set: SetPrisma, setIdx) => (
                    <ListItem key={set.id} disablePadding sx={{alignItems: 'flex-end', mb: 1}}>
                      <ListItemText primary={`Set ${setIdx + 1}`} sx={{minWidth: 60, flex: 'none', mr: 2}}/>
                      <TextField
                        label="Weight"
                        size="small"
                        autoComplete="off"
                        value={set.weight ?? ''}
                        onChange={(e) => handleSetUpdate(setIdx, 'weight', e.target.value)}
                        sx={{mr: 1, width: 100}}
                      />
                      <TextField
                        label="Reps"
                        type="text"
                        size="small"
                        autoComplete="off"
                        value={set.reps ?? ''}
                        onChange={(e) => {
                          handleSetUpdate(setIdx, 'reps', e.target.value);
                        }}
                        sx={{width: 80}}
                        inputProps={{inputMode: 'numeric', pattern: '[0-9]*'}}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </SwiperSlide>
          ))}
        </Swiper>
        <Box
          className="custom-swiper-pagination"
          ref={paginationRef}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 48,
            mt: 1,
          }}
        />
        <Stopwatch
          isRunning={stopwatchIsRunning}
          startTimestamp={stopwatchStartTimestamp}
          pausedTime={stopwatchPausedTime}
          onStartStop={onStopwatchStartStop}
          onReset={onStopwatchReset}
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