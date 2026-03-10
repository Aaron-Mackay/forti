'use client';

import {useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {queueOrSendRequest, syncQueuedRequests} from '@/utils/offlineSync';
import {UserPrisma, WorkoutPrisma} from '@/types/dataTypes';

import WeeksListView from './WeeksListView';
import WorkoutsListView from './WorkoutsListView';
import ExercisesListView from './ExercisesListView';
import ExerciseDetailView from './ExerciseDetailView';
import {
  updateCardioData,
  updateUserExerciseNote,
  updateUserSets,
  updateWorkoutDateCompleted,
  updateWorkoutNotes,
} from "@/utils/userPlanMutators";
import PlansListView from "@/app/user/workout/PlansListView";
import WorkoutCompletionModal from "@/app/user/workout/WorkoutCompletionModal";
import {StopwatchProvider} from "@/app/user/workout/StopwatchContext";

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info';
};

type Field = 'weight' | 'reps';

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

export default function WorkoutClient({userData}: { userData: UserPrisma }) {
  const searchParams = useSearchParams();
  const workoutIdParam = searchParams.get('workoutId');
  const initialContext = workoutIdParam
    ? findWorkoutContext(userData, Number(workoutIdParam))
    : null;

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(initialContext?.planId ?? null);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(initialContext?.weekId ?? null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(initialContext?.workoutId ?? null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  type CompletionModal = { workout: WorkoutPrisma; done: number; total: number };
  const [completionModal, setCompletionModal] = useState<CompletionModal | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [userDataState, setUserData] = useState(userData);

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

    const parsedValue = value === '' ? null : Number(value);
    const updatedSets = selectedExercise.sets.map((set, idx) =>
      idx === setIdx
        ? {...set, [field]: parsedValue}
        : set
    );

    // Optimistically update userDataState
    setUserData((prev) =>
      updateUserSets(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, selectedExerciseId, updatedSets)
    );

    // Fire PATCH request in background
    queueOrSendRequest(`/api/sets/${updatedSets[setIdx].id}`, 'PATCH', {
      [field]: parsedValue,
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

  const handleCompleteWorkout = (completed: boolean) => {
    if (!(selectedPlanId && selectedWeekId && selectedWorkoutId)) return;

    if (completed && selectedWeek && selectedWorkout) {
      const done = selectedWeek.workouts.filter(w => w.dateCompleted && w.id !== selectedWorkoutId).length + 1;
      setCompletionModal({workout: selectedWorkout, done, total: selectedWeek.workouts.length});
    }

    const prevUserData = userDataState;
    const dateCompleted = completed ? new Date() : null;

    setUserData(prev =>
      updateWorkoutDateCompleted(prev, selectedPlanId, selectedWeekId, selectedWorkoutId, dateCompleted)
    );

    queueOrSendRequest(`/api/workout/${selectedWorkoutId}`, 'PATCH', {
      dateCompleted: dateCompleted ? dateCompleted.toISOString() : null,
    })
      .then(() => {
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
    queueOrSendRequest(`/api/workoutExercise/${workoutExerciseId}`, 'PATCH', {[field]: value});
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
  let view;
  if (selectedPlan && selectedWeek && selectedWorkout && selectedExerciseId) {
    view = (
      <ExerciseDetailView
        workout={selectedWorkout}
        currentWorkoutId={selectedWorkout.id}
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
        onCardioUpdate={handleCardioUpdate}
        snackbar={snackbar}
        handleSnackbarClose={handleSnackbarClose}
      />
    );
  } else if (selectedPlan && selectedWeek && selectedWorkout) {
    view = (
      <ExercisesListView
        workout={selectedWorkout}
        onBack={goBack}
        onSelectExercise={setSelectedExerciseId}
        onWorkoutNoteBlur={handleWorkoutNoteBlur}
        onCompleteWorkout={handleCompleteWorkout}
      />
    );
  } else if (selectedPlan && selectedWeek) {
    view = (
      <WorkoutsListView
        week={selectedWeek}
        onBack={goBack}
        onSelectWorkout={setSelectedWorkoutId}
      />
    );
  } else if (selectedPlan) {
    view = (
      <WeeksListView
        plan={selectedPlan}
        onBack={goBack}
        onSelectWeek={setSelectedWeekId}
      />
    );
  } else {
    view = <PlansListView userData={userDataState} onSelectPlan={setSelectedPlanId}/>;
  }

  return (
    <StopwatchProvider>
      {view}
      {completionModal && (
        <WorkoutCompletionModal
          open={!!completionModal}
          onClose={() => setCompletionModal(null)}
          workout={completionModal.workout}
          weekWorkoutsCompleted={completionModal.done}
          weekWorkoutsTotal={completionModal.total}
        />
      )}
    </StopwatchProvider>
  );
}
