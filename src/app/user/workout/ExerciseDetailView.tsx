'use client';

import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Box,
  Collapse,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InfoIcon from '@mui/icons-material/Info';
import {Swiper, SwiperSlide} from 'swiper/react';
import {Pagination} from 'swiper/modules';
import {Swiper as SwiperType} from 'swiper/types';
import 'swiper/css';
import 'swiper/css/pagination';
import './styles.css';
import {SetPrisma, WorkoutExercisePrisma, WorkoutPrisma} from '@/types/dataTypes';
import {UserExerciseNote} from '@prisma/client';
import Stopwatch from "./Stopwatch";
import CustomAppBar from "@/components/CustomAppBar";

type PreviousSet = {weight: string | null; reps: number | null; order: number};

function ExerciseSlide({
  ex,
  userExerciseNote,
  onFormCueBlur,
  handleSetUpdate,
  previousSets,
}: {
  ex: WorkoutExercisePrisma;
  userExerciseNote: UserExerciseNote | undefined;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  handleSetUpdate: (setIdx: number, field: 'weight' | 'reps', value: string) => void;
  previousSets: PreviousSet[] | undefined;
}) {
  const [formCue, setFormCue] = useState(userExerciseNote?.note ?? '');
  const [formCueOpen, setFormCueOpen] = useState(false);

  const hasFormCue = formCue.trim().length > 0;

  return (
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
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', m: 1, width: '100%'}}>
        <Typography variant="subtitle1" gutterBottom>
          Rest: {ex.restTime}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Reps: {ex.repRange}
        </Typography>
      </Box>

      {/* Form cues */}
      <Box sx={{width: '100%', mb: 1}}>
        <Box
          sx={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}
          onClick={() => setFormCueOpen(o => !o)}
        >
          <IconButton size="small" color={hasFormCue ? 'primary' : 'default'} sx={{mr: 0.5}}>
            {formCueOpen || hasFormCue ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
          </IconButton>
          <Typography variant="caption" color={hasFormCue ? 'primary' : 'text.secondary'}>
            Your exercise notes
          </Typography>
        </Box>
        <Collapse in={formCueOpen}>
          <TextField
            multiline
            fullWidth
            minRows={2}
            maxRows={4}
            placeholder="Add form cues and notes for this exercise..."
            value={formCue}
            onChange={e => setFormCue(e.target.value)}
            onBlur={() => onFormCueBlur(ex.exerciseId, formCue)}
            size="small"
            sx={{
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                borderColor: 'warning.main',
                '&.Mui-focused fieldset': {borderColor: 'warning.main'},
              },
            }}
          />
        </Collapse>
      </Box>

      <List sx={{width: '100%'}}>
        {ex.sets.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
            No sets recorded.
          </Typography>
        )}
        {ex.sets.map((set: SetPrisma, setIdx) => {
          const prev = previousSets?.find(s => s.order === set.order);
          return (
            <ListItem key={set.id} disablePadding sx={{alignItems: 'flex-start', mb: 1, flexDirection: 'column'}}>
              <Box sx={{display: 'flex', alignItems: 'flex-end', width: '100%'}}>
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
              </Box>
              {prev && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{pl: '76px', mt: 0.25}}
                  aria-label={`Previous: ${prev.weight ?? '—'} × ${prev.reps ?? '—'}`}
                >
                  Last: {prev.weight ?? '—'} × {prev.reps ?? '—'}
                </Typography>
              )}
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}

export default function ExerciseDetailView({
                                             workout,
                                             currentWorkoutId,
                                             activeExerciseId,
                                             userExerciseNotes,
                                             onBack,
                                             onSlideChange,
                                             handleSetUpdate,
                                             onFormCueBlur,
                                             snackbar,
                                             handleSnackbarClose,
                                             stopwatchIsRunning,
                                             stopwatchStartTimestamp,
                                             stopwatchPausedTime,
                                             onStopwatchStartStop,
                                             onStopwatchReset,
                                             isStopwatchVisible,
                                             setIsStopwatchVisible
                                           }: {
  workout: WorkoutPrisma;
  currentWorkoutId: number;
  activeExerciseId: number;
  userExerciseNotes: UserExerciseNote[];
  onBack: () => void;
  onSlideChange: (swiper: SwiperType) => void;
  handleSetUpdate: (setIdx: number, field: 'weight' | 'reps', value: string) => void;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  snackbar: { open: boolean; message: string; severity: 'success' | 'info' };
  handleSnackbarClose: () => void;
  stopwatchIsRunning: boolean;
  stopwatchStartTimestamp: number | null;
  stopwatchPausedTime: number;
  onStopwatchStartStop: () => void;
  onStopwatchReset: () => void;
  isStopwatchVisible: boolean;
  setIsStopwatchVisible: (isVisible: boolean) => void;
}) {
  const paginationRef = useRef<HTMLDivElement | null>(null);
  // Keyed by exerciseId (global Exercise table id)
  const [previousSetsMap, setPreviousSetsMap] = useState<Map<number, PreviousSet[]>>(new Map());

  const fetchPreviousSets = (exerciseId: number) => {
    if (previousSetsMap.has(exerciseId)) return;
    fetch(`/api/exercises/${exerciseId}/previous-sets?currentWorkoutId=${currentWorkoutId}`)
      .then(res => res.ok ? res.json() : [])
      .then((sets: PreviousSet[]) => {
        setPreviousSetsMap(prev => new Map(prev).set(exerciseId, sets));
      })
      .catch(() => {/* ignore fetch errors — previous data is optional */});
  };

  // Fetch for the initially active exercise on mount
  useEffect(() => {
    const initial = workout.exercises.find(e => e.id === activeExerciseId);
    if (initial) fetchPreviousSets(initial.exerciseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSlideChange = (swiper: SwiperType) => {
    onSlideChange(swiper);
    const ex = workout.exercises[swiper.activeIndex];
    if (ex) fetchPreviousSets(ex.exerciseId);
  };

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
          onSlideChange={handleSlideChange}
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
              <ExerciseSlide
                ex={ex}
                userExerciseNote={userExerciseNotes.find(n => n.exerciseId === ex.exerciseId)}
                onFormCueBlur={onFormCueBlur}
                handleSetUpdate={handleSetUpdate}
                previousSets={previousSetsMap.get(ex.exerciseId)}
              />
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
          isStopwatchVisible={isStopwatchVisible}
          setIsStopwatchVisible={setIsStopwatchVisible}
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
