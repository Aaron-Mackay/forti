'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {queueOrSendRequest, queueOrSendRequestJson, syncQueuedRequests} from '@/utils/offlineSync';
import {getUserDataCache, saveUserDataCache} from '@/utils/clientDb';
import {useOfflineCache} from '@lib/hooks/useOfflineCache';
import {UserPrisma, WorkoutExercisePrisma, WorkoutPrisma} from '@/types/dataTypes';
import {
  addExerciseToWorkout,
  removeExercise,
  substituteExercise,
  updateCardioData,
  updateSetEffort,
  updateUserExerciseNote,
  updateUserSets,
  updateWorkoutDateCompleted,
  updateWorkoutNotes,
} from '@/utils/userPlanMutators';
import {Exercise} from '@/generated/prisma/browser';
import {AddExerciseConfig} from './AddExerciseConfigDialog';
import { trackFirstWeekEvent } from '@lib/firstWeekEvents';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info';
};

type CompletionModal = {workout: WorkoutPrisma; done: number; total: number};
type Field = 'weight' | 'reps';

type SubstituteTarget = {
  workoutExerciseId: number;
  exerciseId: number;
  category: string;
} | null;

// Returns true if the plan structure changed in a way the user should know about
// (plans added/removed, workouts added/removed, exercises added/removed per workout).
function detectStructuralChange(prev: UserPrisma, next: UserPrisma): boolean {
  if (prev.plans.length !== next.plans.length) return true;
  for (let i = 0; i < prev.plans.length; i++) {
    if (prev.plans[i].id !== next.plans[i].id) return true;
    const prevWorkouts = prev.plans[i].weeks.flatMap(w => w.workouts);
    const nextWorkouts = next.plans[i].weeks.flatMap(w => w.workouts);
    if (prevWorkouts.length !== nextWorkouts.length) return true;
    for (let j = 0; j < prevWorkouts.length; j++) {
      if (prevWorkouts[j].exercises.length !== nextWorkouts[j].exercises.length) return true;
    }
  }
  return false;
}

function findWorkoutContext(userData: UserPrisma, workoutId: number) {
  for (const plan of userData.plans) {
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        if (workout.id === workoutId) {
          return {planId: plan.id, weekId: week.id, workoutId: workout.id};
        }
      }
    }
  }
  return null;
}

export function useWorkoutSession(userData: UserPrisma, initialWorkoutId: number | null) {
  const initialContext = initialWorkoutId
    ? findWorkoutContext(userData, initialWorkoutId)
    : null;

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(initialContext?.planId ?? userData.activePlanId ?? null);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(initialContext?.weekId ?? null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(initialContext?.workoutId ?? null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const [completionModal, setCompletionModal] = useState<CompletionModal | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({open: false, message: '', severity: 'success'});
  const [userDataState, setUserData] = useState(userData);
  const latestUserDataRef = useRef<UserPrisma>(userDataState);
  const [planUpdatedBanner, setPlanUpdatedBanner] = useState(false);

  // Substitute dialog state
  const [substituteTarget, setSubstituteTarget] = useState<SubstituteTarget>(null);

  // Add exercise dialog state
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null);

  // Debounce timer for cache writes
  const cacheWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-set-field network timers to avoid race conditions and truncation during rapid typing
  const networkTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingWorkoutExerciseId = useRef(-1);

  // On mount: if offline restore cache; if online prime cache
  useOfflineCache(userDataState.id, userDataState, setUserData, getUserDataCache, saveUserDataCache);

  // Debounced cache write on every state change
  useEffect(() => {
    if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = setTimeout(() => {
      saveUserDataCache(userDataState.id, userDataState).catch(console.error);
    }, 500);
    return () => {
      if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    };
  }, [userDataState]);

  useEffect(() => {
    latestUserDataRef.current = userDataState;
  }, [userDataState]);

  useEffect(() => {
    return () => {
      for (const timer of networkTimers.current.values()) clearTimeout(timer);
      networkTimers.current.clear();
    };
  }, []);

  // On reconnect: flush queue, re-fetch fresh data, show banner on structural change
  useEffect(() => {
    const handleOnline = async () => {
      await syncQueuedRequests();
      try {
        const response = await fetch('/api/user-data');
        if (!response.ok) return;
        const freshData: UserPrisma = await response.json();
        const hadStructuralChange = detectStructuralChange(latestUserDataRef.current, freshData);
        setUserData(freshData);
        await saveUserDataCache(freshData.id, freshData).catch(console.error);
        if (hadStructuralChange) setPlanUpdatedBanner(true);
      } catch {
        // Server unreachable — stay with local state
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived selectors
  const selectedPlan = userDataState.plans.find(p => p.id === selectedPlanId);
  const selectedWeek = selectedPlan?.weeks.find(w => w.id === selectedWeekId);
  const selectedWorkout = selectedWeek?.workouts.find(w => w.id === selectedWorkoutId);

  const depth = selectedExerciseId ? 4 : selectedWorkoutId ? 3 : selectedWeekId ? 2 : selectedPlanId ? 1 : 0;

  const prevDepthRef = useRef<number | null>(null);
  const isPopStateNavRef = useRef(false);

  const goBack = useCallback(() => {
    if (selectedExerciseId) setSelectedExerciseId(null);
    else if (selectedWorkoutId) setSelectedWorkoutId(null);
    else if (selectedWeekId) setSelectedWeekId(null);
    else if (selectedPlanId) setSelectedPlanId(null);
  }, [selectedExerciseId, selectedWorkoutId, selectedWeekId, selectedPlanId]);

  const goBackRef = useRef(goBack);
  useEffect(() => { goBackRef.current = goBack; }, [goBack]);

  // Push browser history entries on forward navigation so the browser back button
  // mirrors the AppBar back button. On initial render, seed entries for any
  // pre-selected depth (handles deep-links like ?workoutId=123).
  useEffect(() => {
    if (prevDepthRef.current === null) {
      history.replaceState({ workoutClientDepth: 0 }, '');
      for (let i = 1; i <= depth; i++) {
        history.pushState({ workoutClientDepth: i }, '');
      }
      prevDepthRef.current = depth;
      return;
    }
    if (isPopStateNavRef.current) {
      isPopStateNavRef.current = false;
      prevDepthRef.current = depth;
      return;
    }
    if (depth > prevDepthRef.current) {
      history.pushState({ workoutClientDepth: depth }, '');
    }
    prevDepthRef.current = depth;
  }, [depth]);

  useEffect(() => {
    const handlePopState = () => {
      isPopStateNavRef.current = true;
      goBackRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Used by the AppBar back button — routes through history.back() so browser
  // history and React state stay in sync (no ghost entries).
  const navigateBack = useCallback(() => {
    if (depth > 0) history.back();
  }, [depth]);

  const handleSetUpdate = (setIdx: number, field: Field, value: string) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId && selectedExerciseId)) return;

    const plan = userDataState.plans.find(p => p.id === selectedPlanId);
    const week = plan?.weeks.find(w => w.id === selectedWeekId);
    const workout = week?.workouts.find(w => w.id === selectedWorkoutId);
    const exercise = workout?.exercises.find(e => e.id === selectedExerciseId);
    if (!exercise) return;

    const parsedValue = value === '' ? null : Number(value);
    const primarySet = exercise.sets[setIdx];

    // Auto-fill empty drop set weights at 20% reduction per drop (cascading, rounded to 2.5 kg)
    const autoFillMap = new Map<number, number>();
    if (field === 'weight' && parsedValue !== null && !primarySet.isDropSet) {
      exercise.sets
        .filter(s => s.isDropSet && s.parentSetId === primarySet.id && s.reps === null)
        .sort((a, b) => a.order - b.order)
        .forEach((drop, i) => {
          const dropWeight = Math.round((parsedValue * Math.pow(0.8, i + 1)) / 2.5) * 2.5;
          autoFillMap.set(drop.id, dropWeight);
        });
    }

    const updatedSets = exercise.sets.map((set, idx) => {
      if (idx === setIdx) return {...set, [field]: parsedValue};
      if (autoFillMap.has(set.id)) return {...set, weight: autoFillMap.get(set.id)!};
      return set;
    });

    setUserData(prev =>
      updateUserSets(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, selectedExerciseId, updatedSets)
    );

    // Debounce the network request to avoid race conditions and truncation
    const setId = updatedSets[setIdx].id;
    const timerKey = `${setId}-${field}`;
    if (networkTimers.current.has(timerKey)) {
      clearTimeout(networkTimers.current.get(timerKey)!);
    }

    const timer = setTimeout(() => {
      queueOrSendRequest(`/api/sets/${setId}`, 'PATCH', {[field]: parsedValue})
        .then(() => setSnackbar({
          open: true,
          message: navigator.onLine ? 'Set updated' : 'Offline: update queued',
          severity: navigator.onLine ? 'success' : 'info',
        }))
        .catch(() => {
          // We no longer roll back state here because it causes truncation during rapid typing.
          // The failure is surfaced via snackbar, and the user can retry or rely on offline sync.
          setSnackbar({open: true, message: 'Failed to update set', severity: 'info'});
        });
      networkTimers.current.delete(timerKey);
    }, 500);

    networkTimers.current.set(timerKey, timer);

    for (const [fid, weight] of autoFillMap) {
      queueOrSendRequest(`/api/sets/${fid}`, 'PATCH', {weight});
    }
  };

  const handleWorkoutNoteBlur = (note: string) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;
    setUserData(prev => updateWorkoutNotes(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, note));
    queueOrSendRequest(`/api/workout/${selectedWorkoutId}`, 'PATCH', {notes: note});
  };

  const handleCompleteWorkout = (completed: boolean, date?: Date) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;

    if (completed && selectedWeek && selectedWorkout) {
      const done = selectedWeek.workouts.filter(w => w.dateCompleted && w.id !== selectedWorkoutId).length + 1;
      setCompletionModal({workout: selectedWorkout, done, total: selectedWeek.workouts.length});
    }

    const prevUserData = userDataState;
    const dateCompleted = completed ? (date ?? new Date()) : null;

    setUserData(prev =>
      updateWorkoutDateCompleted(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, dateCompleted)
    );

    queueOrSendRequest(`/api/workout/${selectedWorkoutId}`, 'PATCH', {
      dateCompleted: dateCompleted ? dateCompleted.toISOString() : null,
    })
      .then(() => {
        if (completed) {
          trackFirstWeekEvent('first_workout_completed', { source: 'workout' });
        }
        setSnackbar({
          open: true,
          message: completed ? 'Workout completed!' : 'Workout marked incomplete',
          severity: 'success',
        });
      })
      .catch(() => {
        setUserData(prevUserData);
        setSnackbar({open: true, message: 'Failed to update workout', severity: 'info'});
      });
  };

  const handleCardioUpdate = (
    workoutExerciseId: number,
    field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance',
    value: number | null
  ) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;
    setUserData(prev =>
      updateCardioData(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, workoutExerciseId, field, value)
    );

    // Debounce the network request to avoid race conditions and truncation
    const timerKey = `${workoutExerciseId}-${field}`;
    if (networkTimers.current.has(timerKey)) {
      clearTimeout(networkTimers.current.get(timerKey)!);
    }

    const timer = setTimeout(() => {
      queueOrSendRequest(`/api/workoutExercise/${workoutExerciseId}`, 'PATCH', {[field]: value});
      networkTimers.current.delete(timerKey);
    }, 500);

    networkTimers.current.set(timerKey, timer);
  };

  const handleFormCueBlur = (exerciseId: number, note: string) => {
    const prevUserData = userDataState;
    setUserData(prev => updateUserExerciseNote(prev, exerciseId, note));
    queueOrSendRequest(`/api/exerciseNote/${exerciseId}`, 'PUT', {note})
      .then(({queued}) => {
        setSnackbar({
          open: true,
          message: queued ? 'Offline: note update queued' : 'Form cue updated',
          severity: queued ? 'info' : 'success',
        });
      })
      .catch(() => {
        setUserData(prevUserData);
        setSnackbar({open: true, message: 'Failed to update form cue', severity: 'info'});
      });
  };

  const handleSnackbarClose = () => setSnackbar(s => ({...s, open: false}));

  const handleSubstituteExercise = (workoutExerciseId: number) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;
    const workout = userDataState.plans
      .flatMap(p => p.weeks).flatMap(w => w.workouts)
      .find(wo => wo.id === selectedWorkoutId);
    const ex = workout?.exercises.find(e => e.id === workoutExerciseId);
    if (!ex) return;
    setSubstituteTarget({
      workoutExerciseId,
      exerciseId: ex.exerciseId,
      category: ex.exercise.category ?? 'resistance',
    });
  };

  const handleSubstituteConfirm = (newExercise: Exercise) => {
    if (!(substituteTarget && selectedPlanId && selectedWeekId && selectedWorkoutId)) return;
    setSubstituteTarget(null);

    const prevUserData = userDataState;
    setUserData(prev =>
      substituteExercise(
        prev, selectedPlanId, selectedWeekId, selectedWorkoutId,
        substituteTarget.workoutExerciseId, newExercise, substituteTarget.exerciseId
      )
    );

    queueOrSendRequest(
      `/api/workoutExercise/${substituteTarget.workoutExerciseId}`,
      'PATCH',
      {exerciseId: newExercise.id}
    )
      .then(() => setSnackbar({open: true, message: 'Exercise substituted', severity: 'success'}))
      .catch(() => {
        setUserData(prevUserData);
        setSnackbar({open: true, message: 'Failed to substitute exercise', severity: 'info'});
      });
  };

  const handleAddExercise = (exercise: Exercise, config: AddExerciseConfig) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;

    const order = (selectedWorkout?.exercises.length ?? 0) + 1;
    const prevUserData = userDataState;
    const optimisticId = pendingWorkoutExerciseId.current--;
    const optimisticExercise: WorkoutExercisePrisma = {
      id: optimisticId,
      workoutId: selectedWorkoutId,
      exerciseId: exercise.id,
      order,
      repRange: config.repRange,
      restTime: config.restTime,
      targetRpe: null,
      targetRir: null,
      exercise,
      sets: [],
      notes: '',
      cardioDuration: null,
      cardioDistance: null,
      cardioResistance: null,
      substitutedForId: null,
      substitutedFor: null,
      isAdded: true,
      isBfr: false,
    };

    setUserData(prev =>
      addExerciseToWorkout(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, optimisticExercise)
    );

    queueOrSendRequestJson<WorkoutExercisePrisma>('/api/workoutExercise', 'POST', {
        workoutId: selectedWorkoutId,
        exerciseId: exercise.id,
        order,
        repRange: config.repRange,
        restTime: config.restTime,
        setCount: config.setCount,
    })
      .then(({queued, data}) => {
        if (!queued && data) {
          setUserData(prev => {
            const withoutOptimistic = removeExercise(
              prev,
              selectedPlanId,
              selectedWeekId,
              selectedWorkoutId,
              optimisticId,
            );
            return addExerciseToWorkout(withoutOptimistic, selectedPlanId, selectedWeekId, selectedWorkoutId, data);
          });
        }
        setSnackbar({
          open: true,
          message: queued ? 'Offline: exercise addition queued' : 'Exercise added',
          severity: queued ? 'info' : 'success',
        });
      })
      .catch(() => {
        setUserData(prevUserData);
        setSnackbar({open: true, message: 'Failed to add exercise', severity: 'info'});
      });
  };

  const handleEffortUpdate = (setId: number, field: 'rpe' | 'rir', value: number | null) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId && selectedExerciseId)) return;

    setUserData(prev =>
      updateSetEffort(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, selectedExerciseId, setId, field, value)
    );

    queueOrSendRequest(`/api/sets/${setId}`, 'PATCH', {[field]: value})
      .catch(() => {
        setSnackbar({open: true, message: 'Failed to update effort', severity: 'info'});
      });
  };

  const handleRemoveExercise = (workoutExerciseId: number) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;
    const prevUserData = userDataState;
    setUserData(prev => removeExercise(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, workoutExerciseId));
    if (workoutExerciseId < 0) {
      setSnackbar({open: true, message: 'Offline: pending exercise removed locally', severity: 'info'});
      return;
    }
    queueOrSendRequest(`/api/workoutExercise/${workoutExerciseId}`, 'DELETE', {})
      .then(({queued}) => setSnackbar({
        open: true,
        message: queued ? 'Offline: exercise removal queued' : 'Exercise removed',
        severity: queued ? 'info' : 'success',
      }))
      .catch(() => {
        setUserData(prevUserData);
        setSnackbar({open: true, message: 'Failed to remove exercise', severity: 'info'});
      });
  };

  return {
    // Data
    userDataState,
    // Navigation state + setters
    selectedPlanId, setSelectedPlanId,
    selectedWeekId, setSelectedWeekId,
    selectedWorkoutId, setSelectedWorkoutId,
    selectedExerciseId, setSelectedExerciseId,
    // Derived
    selectedPlan, selectedWeek, selectedWorkout,
    // UI state
    completionModal, setCompletionModal,
    snackbar,
    planUpdatedBanner, setPlanUpdatedBanner,
    substituteTarget, setSubstituteTarget,
    showAddExercise, setShowAddExercise,
    pendingExercise, setPendingExercise,
    // Handlers
    navigateBack,
    handleSetUpdate,
    handleEffortUpdate,
    handleWorkoutNoteBlur,
    handleCompleteWorkout,
    handleCardioUpdate,
    handleFormCueBlur,
    handleSnackbarClose,
    handleSubstituteExercise,
    handleSubstituteConfirm,
    handleAddExercise,
    handleRemoveExercise,
  };
}
