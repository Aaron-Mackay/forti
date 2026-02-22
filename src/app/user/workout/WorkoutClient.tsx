'use client';

import React, {useEffect, useState} from 'react';
import {queueOrSendRequest, syncQueuedRequests} from '@/utils/offlineSync';
import {UserPrisma} from '@/types/dataTypes';

import WeeksListView from './WeeksListView';
import WorkoutsListView from './WorkoutsListView';
import ExercisesListView from './ExercisesListView';
import ExerciseDetailView from './ExerciseDetailView';
import {
  updateUserSets,
  updateWorkoutNotes,
  updateUserExerciseNote,
} from "@/utils/userPlanMutators";
import PlansListView from "@/app/user/workout/PlansListView";

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info';
};

type Field = 'weight' | 'reps';

export default function WorkoutClient({userData}: { userData: UserPrisma }) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [userDataState, setUserData] = useState(userData);

  // shared stopwatch state so it can be running in multiple views
  const [isStopwatchVisible, setIsStopwatchVisible] = useState(false);
  const [stopwatch, setStopwatch] = useState({
    time: 0,
    isRunning: false,
    startTimestamp: null as null | number,
    pausedTime: 0
  });
  const handleStartStop = () => {
    if (stopwatch.isRunning) {
      setStopwatch(sw => ({
        ...sw,
        isRunning: false,
        pausedTime: sw.startTimestamp !== null ? sw.pausedTime + Math.floor((Date.now() - (sw.startTimestamp ?? 0)) / 100) : sw.pausedTime,
        startTimestamp: null
      }));
    } else {
      setStopwatch(sw => ({
        ...sw,
        isRunning: true,
        startTimestamp: Date.now()
      }));
    }
  };
  const handleReset = () => {
    setStopwatch({time: 0, isRunning: false, startTimestamp: null, pausedTime: 0});
  };

  // Sync queued requests when coming online
  useEffect(() => {
    const sync = () => syncQueuedRequests();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  // Selectors
  const selectedPlan = userDataState.plans.find((p) => p.id === selectedPlanId);
  const selectedWeek = selectedPlan?.weeks.find((w) => w.id === selectedWeekId);
  const selectedWorkout = selectedWeek?.workouts.find((w) => w.id === selectedWorkoutId);

  // Navigation handlers
  const goBack = () => {
    if (selectedExerciseId) setSelectedExerciseId(null);
    else if (selectedWorkoutId) setSelectedWorkoutId(null);
    else if (selectedWeekId) setSelectedWeekId(null);
    else if (selectedPlanId) setSelectedPlanId(null);
  };

  // Handle set update (auto-save on change)
  const handleSetUpdate = (setIdx: number, field: Field, value: string) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId && selectedExerciseId)) return;

    // Save previous state for possible revert
    const prevUserData = userDataState;

    // Find the current sets for the selected exercise
    const selectedPlan = userDataState.plans.find((p) => p.id === selectedPlanId);
    const selectedWeek = selectedPlan?.weeks.find((w) => w.id === selectedWeekId);
    const selectedWorkout = selectedWeek?.workouts.find((w) => w.id === selectedWorkoutId);
    const selectedExercise = selectedWorkout?.exercises.find((e) => e.id === selectedExerciseId);
    if (!selectedExercise) return;

    const updatedSets = selectedExercise.sets.map((set, idx) =>
      idx === setIdx ? {...set, [field]: field === 'weight' ? value : Number(value)} : set
    );

    // Optimistically update userDataState
    setUserData((prev) =>
      updateUserSets(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, selectedExerciseId, updatedSets)
    );

    // Fire PATCH request in background
    queueOrSendRequest(`/api/sets/${updatedSets[setIdx].id}`, 'PATCH', {
      [field]: field === 'reps' ? Number(value) : value,
    })
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

  const handleWorkoutNoteBlur = (note: string) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;
    setUserData(prev => updateWorkoutNotes(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, note));
    queueOrSendRequest(`/api/workout/${selectedWorkoutId}`, 'PATCH', {notes: note});
  };

  const handleFormCueBlur = (exerciseId: number, note: string) => {
    setUserData(prev => updateUserExerciseNote(prev, exerciseId, note));
    fetch(`/api/exerciseNote/${exerciseId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({note}),
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar((s) => ({...s, open: false}));
  };

  // View switching
  if (selectedPlan && selectedWeek && selectedWorkout && selectedExerciseId) {
    return (
      <ExerciseDetailView
        workout={selectedWorkout}
        activeExerciseId={selectedExerciseId}
        userExerciseNotes={userDataState.userExerciseNotes}
        onBack={goBack}
        onSlideChange={(swiper) => {
          const newExercise = selectedWorkout.exercises[swiper.activeIndex];
          if (newExercise && newExercise.id !== selectedExerciseId) {
            setSelectedExerciseId(newExercise.id);
          }
        }}
        handleSetUpdate={handleSetUpdate}
        onFormCueBlur={handleFormCueBlur}
        snackbar={snackbar}
        handleSnackbarClose={handleSnackbarClose}
        stopwatchIsRunning={stopwatch.isRunning}
        stopwatchStartTimestamp={stopwatch.startTimestamp}
        stopwatchPausedTime={stopwatch.pausedTime}
        onStopwatchStartStop={handleStartStop}
        onStopwatchReset={handleReset}
        isStopwatchVisible={isStopwatchVisible}
        setIsStopwatchVisible={setIsStopwatchVisible}
      />
    );
  }

  if (selectedPlan && selectedWeek && selectedWorkout) {
    return (
      <ExercisesListView
        workout={selectedWorkout}
        onBack={goBack}
        onSelectExercise={setSelectedExerciseId}
        onWorkoutNoteBlur={handleWorkoutNoteBlur}
        stopwatchIsRunning={stopwatch.isRunning}
        stopwatchStartTimestamp={stopwatch.startTimestamp}
        stopwatchPausedTime={stopwatch.pausedTime}
        onStopwatchStartStop={handleStartStop}
        onStopwatchReset={handleReset}
        isStopwatchVisible={isStopwatchVisible}
        setIsStopwatchVisible={setIsStopwatchVisible}
      />
    );
  }

  if (selectedPlan && selectedWeek) {
    return (
      <WorkoutsListView
        week={selectedWeek}
        onBack={goBack}
        onSelectWorkout={setSelectedWorkoutId}
      />
    );
  }

  if (selectedPlan) {
    return (
      <WeeksListView
        plan={selectedPlan}
        onBack={goBack}
        onSelectWeek={setSelectedWeekId}
      />
    );
  }

  return (
    <PlansListView userData={userDataState} onSelectPlan={setSelectedPlanId}/>
  );
}
