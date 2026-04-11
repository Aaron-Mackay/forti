'use client';

import {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Box,
  Container,
  Snackbar,
} from '@mui/material';
import {Swiper, SwiperSlide} from 'swiper/react';
import {Pagination} from 'swiper/modules';
import {Swiper as SwiperType} from 'swiper/types';
import 'swiper/css';
import 'swiper/css/pagination';
import './styles.css';
import {WorkoutPrisma} from '@/types/dataTypes';
import {UserExerciseNote} from '@/generated/prisma/browser';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import AppBarStopwatch from "@/app/user/workout/AppBarStopwatch";
import ExerciseSlide from './ExerciseSlide';
import CardioSlide, {PreviousCardio} from './CardioSlide';
import type {E1rmHistoryPoint} from '@/app/api/exercises/[exerciseId]/e1rm-history/route';
import type {PreviousExerciseHistory} from '@/app/api/exercises/[exerciseId]/previous-sets/route';

export default function ExerciseDetailView({
  workout,
  currentWorkoutId,
  activeExerciseId,
  userExerciseNotes,
  onBack,
  onSlideChange,
  handleSetUpdate,
  handleEffortUpdate,
  onFormCueBlur,
  onCardioUpdate,
  onSubstituteExercise,
  snackbar,
  handleSnackbarClose,
}: {
  workout: WorkoutPrisma;
  currentWorkoutId: number;
  activeExerciseId: number;
  userExerciseNotes: UserExerciseNote[];
  onBack: () => void;
  onSlideChange: (swiper: SwiperType) => void;
  handleSetUpdate: (setIdx: number, field: 'weight' | 'reps', value: string) => void;
  handleEffortUpdate: (setId: number, field: 'rpe' | 'rir', value: number | null) => void;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  onCardioUpdate: (workoutExerciseId: number, field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance', value: number | null) => void;
  onSubstituteExercise: (workoutExerciseId: number) => void;
  snackbar: { open: boolean; message: string; severity: 'success' | 'info' };
  handleSnackbarClose: () => void;
}) {
  useAppBar({ title: 'Exercises', showBack: true, onBack });
  const paginationRef = useRef<HTMLDivElement | null>(null);
  const [previousSetsMap, setPreviousSetsMap] = useState<Map<number, PreviousExerciseHistory>>(new Map());
  const [e1rmHistoryMap, setE1rmHistoryMap] = useState<Map<number, E1rmHistoryPoint[] | null>>(new Map());
  const [previousCardioMap, setPreviousCardioMap] = useState<Map<number, PreviousCardio | null>>(new Map());

  const fetchPreviousSets = (workoutExerciseId: number, exerciseId: number) => {
    if (previousSetsMap.has(workoutExerciseId)) return;
    fetch(`/api/exercises/${exerciseId}/previous-sets?currentWorkoutId=${currentWorkoutId}&currentWorkoutExerciseId=${workoutExerciseId}`)
      .then(res => res.ok ? res.json() : {completedAt: null, sets: []})
      .then((history: PreviousExerciseHistory) => {
        setPreviousSetsMap(prev => new Map(prev).set(workoutExerciseId, history));
      })
      .catch(() => {
        setPreviousSetsMap(prev => new Map(prev).set(workoutExerciseId, {completedAt: null, sets: []}));
      });
  };

  const fetchE1rmHistory = (exerciseId: number) => {
    if (e1rmHistoryMap.has(exerciseId)) return;
    setE1rmHistoryMap(prev => new Map(prev).set(exerciseId, null));
    fetch(`/api/exercises/${exerciseId}/e1rm-history?currentWorkoutId=${currentWorkoutId}`)
      .then(r => (r.ok ? r.json() : []))
      .then((data: E1rmHistoryPoint[]) =>
        setE1rmHistoryMap(prev => new Map(prev).set(exerciseId, data))
      )
      .catch(() => setE1rmHistoryMap(prev => new Map(prev).set(exerciseId, [])));
  };

  const fetchPreviousCardio = (exerciseId: number) => {
    if (previousCardioMap.has(exerciseId)) return;
    fetch(`/api/exercises/${exerciseId}/previous-cardio?currentWorkoutId=${currentWorkoutId}`)
      .then(res => res.ok ? res.json() : null)
      .then((data: PreviousCardio | null) => {
        setPreviousCardioMap(prev => new Map(prev).set(exerciseId, data));
      })
      .catch(() => {/* ignore fetch errors — previous data is optional */
      });
  };

  // Fetch for the initially active exercise on mount
  useEffect(() => {
    const initial = workout.exercises.find(e => e.id === activeExerciseId);
    if (initial) {
      if (initial.exercise.category === 'cardio') {
        fetchPreviousCardio(initial.exerciseId);
      } else {
        fetchPreviousSets(initial.id, initial.exerciseId);
        fetchE1rmHistory(initial.exerciseId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSlideChange = (swiper: SwiperType) => {
    onSlideChange(swiper);
    const ex = workout.exercises[swiper.activeIndex];
    if (ex) {
      if (ex.exercise.category === 'cardio') {
        fetchPreviousCardio(ex.exerciseId);
      } else {
        fetchPreviousSets(ex.id, ex.exerciseId);
        fetchE1rmHistory(ex.exerciseId);
      }
    }
  };

  return (
    <Box sx={{
      height: HEIGHT_EXC_APPBAR,
      bgcolor: 'background.default',
      color: 'text.primary',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Container
        maxWidth="sm"
        sx={{
          py: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          px: 0
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
              {ex.exercise.category === 'cardio' ? (
                <CardioSlide
                  ex={ex}
                  userExerciseNote={userExerciseNotes.find(n => n.exerciseId === ex.exerciseId)}
                  onFormCueBlur={onFormCueBlur}
                  onCardioUpdate={(field, value) => onCardioUpdate(ex.id, field, value)}
                  previousCardio={previousCardioMap.get(ex.exerciseId)}
                />
              ) : (
                <ExerciseSlide
                  ex={ex}
                  userExerciseNote={userExerciseNotes.find(n => n.exerciseId === ex.exerciseId)}
                  onFormCueBlur={onFormCueBlur}
                  handleSetUpdate={handleSetUpdate}
                  handleEffortUpdate={handleEffortUpdate}
                  previousWorkout={previousSetsMap.get(ex.id)}
                  history={e1rmHistoryMap.get(ex.exerciseId) ?? null}
                  onSubstitute={() => onSubstituteExercise(ex.id)}
                />
              )}
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
      </Container>
      <AppBarStopwatch/>
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
