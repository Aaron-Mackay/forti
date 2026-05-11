'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Typography,
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
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import AppBarStopwatch from "@/app/user/workout/AppBarStopwatch";
import ExerciseSlide from './ExerciseSlide';
import CardioSlide from './CardioSlide';
import { SignalExerciseSlide } from './signal/SignalExerciseSlide';
import { SignalGroupedExerciseSlide } from './signal/SignalGroupedExerciseSlide';
import { SignalCardioSlide } from './signal/SignalCardioSlide';
import {
  type E1rmHistoryPoint,
  type PreviousCardioResponse,
  type PreviousExerciseHistory,
} from '@lib/contracts/exerciseHistory';
import { getExerciseE1rmHistory, getPreviousCardio } from '@lib/clientApi';
import {groupWorkoutExercises} from './groupWorkoutExercises';
import GroupedExerciseSlide from './GroupedExerciseSlide';

export default function ExerciseDetailView({
  workout,
  currentWorkoutId,
  activeExerciseId,
  previousSetsMap,
  fetchPreviousSets,
  userExerciseNotes,
  onBack,
  onSlideChange,
  handleSetUpdate,
  handleEffortUpdate,
  onFormCueBlur,
  onCardioUpdate,
  onSubstituteExercise,
  onRemoveExercise,
  snackbar,
  handleSnackbarClose,
  onCompleteWorkout,
  onExcludeFromHistoryChange,
  signalEnabled = false,
}: {
  workout: WorkoutPrisma;
  currentWorkoutId: number;
  activeExerciseId: number;
  previousSetsMap: Map<number, PreviousExerciseHistory>;
  fetchPreviousSets: (currentWorkoutId: number, workoutExerciseId: number, exerciseId: number) => void | Promise<void>;
  userExerciseNotes: UserExerciseNote[];
  onBack: () => void;
  onSlideChange: (swiper: SwiperType) => void;
  handleSetUpdate: (workoutExerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  handleEffortUpdate: (workoutExerciseId: number, setId: number, field: 'rpe' | 'rir', value: number | null) => void;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  onCardioUpdate: (workoutExerciseId: number, field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance', value: number | null) => void;
  onSubstituteExercise: (workoutExerciseId: number) => void;
  onRemoveExercise: (workoutExerciseId: number) => void;
  snackbar: { open: boolean; message: string; severity: 'success' | 'info' };
  handleSnackbarClose: () => void;
  onCompleteWorkout?: (completed: boolean, date?: Date) => void;
  onExcludeFromHistoryChange?: (workoutExerciseId: number, excluded: boolean) => void;
  signalEnabled?: boolean;
}) {
  useAppBar({ title: 'Exercises', showBack: true, onBack });
  const [warnUnloggedOpen, setWarnUnloggedOpen] = useState(false);
  const unloggedCount = workout.exercises.reduce((count, ex) => {
    if (ex.exercise.category === 'cardio') return count;
    return count + ex.sets.filter(s => s.reps == null).length;
  }, 0);
  const paginationRef = useRef<HTMLDivElement | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const exerciseGroups = groupWorkoutExercises(workout.exercises);
  // Frozen on mount — activeExerciseId only changes here via user swipes, never via
  // external navigation, so useRef is safe. Passing a live value causes Swiper v12's
  // React wrapper to call update() mid-animation, which is the root cause of the
  // halfway-stuck bug.
  const initialSlide = useRef(
    Math.max(0, exerciseGroups.findIndex((group) => group.items.some(item => item.id === activeExerciseId)))
  ).current;
  const [e1rmHistoryMap, setE1rmHistoryMap] = useState<Map<number, E1rmHistoryPoint[] | null>>(new Map());
  const [previousCardioMap, setPreviousCardioMap] = useState<Map<number, PreviousCardioResponse>>(new Map());

  const fetchE1rmHistory = useCallback((exerciseId: number) => {
    if (e1rmHistoryMap.has(exerciseId)) return;
    setE1rmHistoryMap(prev => new Map(prev).set(exerciseId, null));
    getExerciseE1rmHistory(exerciseId, {currentWorkoutId})
      .then(data => setE1rmHistoryMap(prev => new Map(prev).set(exerciseId, data)))
      .catch(() => setE1rmHistoryMap(prev => new Map(prev).set(exerciseId, [])));
  }, [currentWorkoutId, e1rmHistoryMap]);

  const fetchPreviousCardio = useCallback((exerciseId: number) => {
    if (previousCardioMap.has(exerciseId)) return;
    getPreviousCardio(exerciseId, {currentWorkoutId})
      .then(data => setPreviousCardioMap(prev => new Map(prev).set(exerciseId, data)))
      .catch(() => {/* ignore fetch errors — previous data is optional */});
  }, [currentWorkoutId, previousCardioMap]);

  // Fetch for the initially active exercise on mount
  useEffect(() => {
    const initialGroup = exerciseGroups.find(group => group.items.some(item => item.id === activeExerciseId));
    if (initialGroup) {
      for (const item of initialGroup.items) {
        if (item.exercise.category === 'cardio') {
          fetchPreviousCardio(item.exerciseId);
        } else {
          if (!previousSetsMap.has(item.id)) {
            fetchPreviousSets(currentWorkoutId, item.id, item.exerciseId);
          }
          fetchE1rmHistory(item.exerciseId);
        }
      }
    }
  }, [activeExerciseId, currentWorkoutId, exerciseGroups, fetchPreviousSets, previousSetsMap]);

  const handleSlideChange = (swiper: SwiperType) => {
    onSlideChange(swiper);
    const group = exerciseGroups[swiper.activeIndex];
    if (group) {
      for (const item of group.items) {
        if (item.exercise.category === 'cardio') {
          fetchPreviousCardio(item.exerciseId);
        } else {
          if (!previousSetsMap.has(item.id)) {
            fetchPreviousSets(currentWorkoutId, item.id, item.exerciseId);
          }
          fetchE1rmHistory(item.exerciseId);
        }
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
          initialSlide={initialSlide}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
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
          {exerciseGroups.map((group, groupIdx) => (
            <SwiperSlide key={group.key} style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              {group.items.length === 1 ? (
                group.items[0].exercise.category === 'cardio' ? (
                  signalEnabled ? (
                    <SignalCardioSlide
                      ex={group.items[0]}
                      onCardioUpdate={(field, value) => onCardioUpdate(group.items[0].id, field, value)}
                      previousCardio={previousCardioMap.get(group.items[0].exerciseId)}
                      nextExerciseName={
                        groupIdx + 1 < exerciseGroups.length
                          ? exerciseGroups[groupIdx + 1].items[0].exercise.name
                          : null
                      }
                      onAdvance={() => {
                        (document.activeElement as HTMLElement | null)?.blur?.();
                        if (groupIdx + 1 < exerciseGroups.length) {
                          swiperRef.current?.slideNext();
                        } else if (onCompleteWorkout) {
                          onCompleteWorkout(true);
                        } else {
                          onBack();
                        }
                      }}
                      onSkip={() => {
                        if (groupIdx + 1 < exerciseGroups.length) {
                          swiperRef.current?.slideNext();
                        } else if (onCompleteWorkout) {
                          onCompleteWorkout(true);
                        } else {
                          onBack();
                        }
                      }}
                    />
                  ) : (
                    <CardioSlide
                      ex={group.items[0]}
                      userExerciseNote={userExerciseNotes.find(n => n.exerciseId === group.items[0].exerciseId)}
                      onFormCueBlur={onFormCueBlur}
                      onCardioUpdate={(field, value) => onCardioUpdate(group.items[0].id, field, value)}
                      previousCardio={previousCardioMap.get(group.items[0].exerciseId)}
                    />
                  )
                ) : signalEnabled ? (
                  <SignalExerciseSlide
                    ex={group.items[0]}
                    userExerciseNote={userExerciseNotes.find(n => n.exerciseId === group.items[0].exerciseId)}
                    onFormCueBlur={onFormCueBlur}
                    handleSetUpdate={handleSetUpdate}
                    previousWorkout={previousSetsMap.get(group.items[0].id)}
                    history={e1rmHistoryMap.get(group.items[0].exerciseId) ?? null}
                    nextExerciseName={
                      groupIdx + 1 < exerciseGroups.length
                        ? exerciseGroups[groupIdx + 1].items[0].exercise.name
                        : null
                    }
                    onAdvance={() => {
                      (document.activeElement as HTMLElement | null)?.blur?.();
                      if (groupIdx + 1 < exerciseGroups.length) {
                        swiperRef.current?.slideNext();
                      } else if (onCompleteWorkout) {
                        if (unloggedCount > 0) {
                          setWarnUnloggedOpen(true);
                        } else {
                          onCompleteWorkout(true);
                        }
                      } else {
                        onBack();
                      }
                    }}
                    onSkip={() => {
                      if (groupIdx + 1 < exerciseGroups.length) {
                        swiperRef.current?.slideNext();
                      } else if (onCompleteWorkout) {
                        onCompleteWorkout(true);
                      } else {
                        onBack();
                      }
                    }}
                    onExcludeFromHistoryChange={onExcludeFromHistoryChange}
                  />
                ) : (
                  <ExerciseSlide
                    ex={group.items[0]}
                    userExerciseNote={userExerciseNotes.find(n => n.exerciseId === group.items[0].exerciseId)}
                    onFormCueBlur={onFormCueBlur}
                    handleSetUpdate={handleSetUpdate}
                    handleEffortUpdate={handleEffortUpdate}
                    previousWorkout={previousSetsMap.get(group.items[0].id)}
                    history={e1rmHistoryMap.get(group.items[0].exerciseId) ?? null}
                    onSubstitute={() => onSubstituteExercise(group.items[0].id)}
                  />
                )
              ) : signalEnabled ? (
                <SignalGroupedExerciseSlide
                  group={group}
                  handleSetUpdate={handleSetUpdate}
                  nextExerciseName={
                    groupIdx + 1 < exerciseGroups.length
                      ? exerciseGroups[groupIdx + 1].items[0].exercise.name
                      : null
                  }
                  onAdvance={() => {
                    (document.activeElement as HTMLElement | null)?.blur?.();
                    if (groupIdx + 1 < exerciseGroups.length) {
                      swiperRef.current?.slideNext();
                    } else if (onCompleteWorkout) {
                      if (unloggedCount > 0) {
                        setWarnUnloggedOpen(true);
                      } else {
                        onCompleteWorkout(true);
                      }
                    } else {
                      onBack();
                    }
                  }}
                  onSkip={() => {
                    if (groupIdx + 1 < exerciseGroups.length) {
                      swiperRef.current?.slideNext();
                    } else if (onCompleteWorkout) {
                      onCompleteWorkout(true);
                    } else {
                      onBack();
                    }
                  }}
                />
              ) : (
                <GroupedExerciseSlide
                  group={group}
                  userExerciseNote={userExerciseNotes.find(n => n.exerciseId === group.exerciseId)}
                  onFormCueBlur={onFormCueBlur}
                  handleSetUpdate={handleSetUpdate}
                  handleEffortUpdate={handleEffortUpdate}
                  history={e1rmHistoryMap.get(group.exerciseId) ?? null}
                  previousSetsMap={previousSetsMap}
                  onSubstituteExercise={onSubstituteExercise}
                  onRemoveExercise={onRemoveExercise}
                  onCardioUpdate={onCardioUpdate}
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
      <Dialog open={warnUnloggedOpen} onClose={() => setWarnUnloggedOpen(false)}>
        <DialogTitle>Unlogged sets</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {unloggedCount} {unloggedCount === 1 ? 'set was' : 'sets were'} unlogged. Complete anyway?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarnUnloggedOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              setWarnUnloggedOpen(false);
              onCompleteWorkout?.(true);
            }}
          >
            Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
