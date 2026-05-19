'use client';

import type {ReactNode} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useWorkoutSession} from './useWorkoutSession';
import type {WorkoutDataResponse} from '@lib/contracts/workoutData';

import WorkoutsListView from './WorkoutsListView';
import ExercisesListView from './ExercisesListView';
import ExerciseDetailView from './ExerciseDetailView';
import ExercisePickerDialog from './ExercisePickerDialog';
import AddExerciseConfigDialog from './AddExerciseConfigDialog';
import WorkoutCompletionModal from '@/app/user/workout/WorkoutCompletionModal';
import { SignalCompletionSheet } from '@/app/user/workout/SignalCompletionSheet';
import {StopwatchProvider} from '@/app/user/workout/StopwatchContext';
import {Alert, Collapse} from '@mui/material';
import type {PreviousExerciseHistory} from '@lib/contracts/exerciseHistory';
import {groupWorkoutExercises} from './groupWorkoutExercises';
import {getPreviousExerciseHistory} from '@lib/clientApi';
import {getWeekStatus} from '@lib/workoutProgress';
import {CompleteWeekModal} from '@/app/user/plan/CompleteWeekModal';

export default function WorkoutClient({userData, signalEnabled = false}: {userData: WorkoutDataResponse; signalEnabled?: boolean}) {
  const searchParams = useSearchParams();
  const workoutIdParam = searchParams.get('workoutId');
  const weekIdParam = searchParams.get('weekId');
  const initialWorkoutId = workoutIdParam ? Number(workoutIdParam) : null;
  const initialWeekId = weekIdParam ? Number(weekIdParam) : null;
  const [previousSetsMap, setPreviousSetsMap] = useState<Map<number, PreviousExerciseHistory>>(new Map());
  const previousSetsMapRef = useRef<Map<number, PreviousExerciseHistory>>(new Map());
  const previousSetsExerciseIdRef = useRef<Map<number, number>>(new Map());
  const previousSetsInFlightRef = useRef<Set<number>>(new Set());

  const {
    userDataState,
    selectedExerciseId, setSelectedExerciseId,
    selectedWeek, selectedWorkout,
    completionModal, setCompletionModal,
    snackbar,
    planUpdatedBanner, setPlanUpdatedBanner,
    substituteTarget, setSubstituteTarget,
    showAddExercise, setShowAddExercise,
    pendingExercise, setPendingExercise,
    navigateBack,
    navigateToWorkoutsList,
    navigateToWorkout,
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
    handleExcludeFromHistoryChange,
  } = useWorkoutSession(userData, initialWorkoutId, initialWeekId);

  useEffect(() => {
    previousSetsMapRef.current = previousSetsMap;
  }, [previousSetsMap]);

  const fetchPreviousSets = useCallback(async (currentWorkoutId: number, workoutExerciseId: number, exerciseId: number) => {
    const fetchedForExerciseId = previousSetsExerciseIdRef.current.get(workoutExerciseId);
    const hasCurrentExerciseHistory = fetchedForExerciseId === exerciseId && previousSetsMapRef.current.has(workoutExerciseId);

    if (hasCurrentExerciseHistory || previousSetsInFlightRef.current.has(workoutExerciseId)) return;

    if (fetchedForExerciseId !== undefined && fetchedForExerciseId !== exerciseId) {
      setPreviousSetsMap(prev => {
        const next = new Map(prev);
        next.delete(workoutExerciseId);
        return next;
      });
    }

    previousSetsInFlightRef.current.add(workoutExerciseId);
    try {
      const history = await getPreviousExerciseHistory(exerciseId, {currentWorkoutId, currentWorkoutExerciseId: workoutExerciseId});
      previousSetsExerciseIdRef.current.set(workoutExerciseId, exerciseId);
      setPreviousSetsMap(prev => new Map(prev).set(workoutExerciseId, history));
    } catch {
      previousSetsExerciseIdRef.current.set(workoutExerciseId, exerciseId);
      setPreviousSetsMap(prev => new Map(prev).set(workoutExerciseId, {workouts: []}));
    } finally {
      previousSetsInFlightRef.current.delete(workoutExerciseId);
    }
  }, []);

  const prefetchPreviousSetsForWorkout = useCallback(async () => {
    if (!selectedWorkout) return;
    const candidates = selectedWorkout.exercises
      .filter(ex => ex.exercise.category !== 'cardio')
      .filter(ex => !previousSetsMapRef.current.has(ex.id));

    const batchSize = 4;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(ex => fetchPreviousSets(selectedWorkout.id, ex.id, ex.exerciseId))
      );
    }
  }, [fetchPreviousSets, selectedWorkout]);
  const selectedWorkoutGroups = selectedWorkout ? groupWorkoutExercises(selectedWorkout.exercises) : [];
  const [completeWeekOpen, setCompleteWeekOpen] = useState(false);
  const activePlan = userDataState.plans.find((plan) => plan.id === userDataState.activePlanId);
  const activeWeek = activePlan?.weeks.find((week) => getWeekStatus(week) !== 'completed') ?? null;
  const canCompleteSelectedWeek = Boolean(
    selectedWeek &&
    activeWeek &&
    selectedWeek.id === activeWeek.id &&
    selectedWeek.workouts.some((workout) => !workout.dateCompleted),
  );

  let view: ReactNode = null;
  const mode: 'workouts' | 'exercises' | 'exerciseDetail' | 'invalid' =
    selectedWorkout && selectedExerciseId
      ? 'exerciseDetail'
      : selectedWorkout
        ? 'exercises'
        : selectedWeek
          ? 'workouts'
          : 'invalid';

  if (mode === 'exerciseDetail') {
    view = (
      <ExerciseDetailView
        workout={selectedWorkout!}
        currentWorkoutId={selectedWorkout!.id}
        activeExerciseId={selectedExerciseId!}
        previousSetsMap={previousSetsMap}
        fetchPreviousSets={fetchPreviousSets}
        userExerciseNotes={userDataState.userExerciseNotes}
        onBack={navigateBack}
        onSlideChange={(swiper) => {
          const newExercise = selectedWorkoutGroups[swiper.activeIndex]?.items[0];
          if (newExercise && newExercise.id !== selectedExerciseId) {
            setSelectedExerciseId(newExercise.id);
          }
        }}
        handleSetUpdate={handleSetUpdate}
        handleEffortUpdate={handleEffortUpdate}
        onFormCueBlur={handleFormCueBlur}
        onCardioUpdate={handleCardioUpdate}
        onSubstituteExercise={handleSubstituteExercise}
        onRemoveExercise={handleRemoveExercise}
        snackbar={snackbar}
        handleSnackbarClose={handleSnackbarClose}
        onCompleteWorkout={handleCompleteWorkout}
        onExcludeFromHistoryChange={handleExcludeFromHistoryChange}
        signalEnabled={signalEnabled}
      />
    );
  } else if (mode === 'exercises') {
    view = (
      <ExercisesListView
        workout={selectedWorkout!}
        onEnter={prefetchPreviousSetsForWorkout}
        onBack={navigateBack}
        onSelectExercise={setSelectedExerciseId}
        onWorkoutNoteBlur={handleWorkoutNoteBlur}
        onCompleteWorkout={handleCompleteWorkout}
        onAddExercise={() => setShowAddExercise(true)}
        onRemoveExercise={handleRemoveExercise}
        signalEnabled={signalEnabled}
      />
    );
  } else if (mode === 'workouts') {
    view = (
      <WorkoutsListView
        week={selectedWeek!}
        onBack={navigateBack}
        onSelectWorkout={navigateToWorkout}
        onCompleteWeek={canCompleteSelectedWeek ? () => setCompleteWeekOpen(true) : undefined}
        signalEnabled={signalEnabled}
      />
    );
  }

  return (
    <StopwatchProvider>
      <Collapse in={planUpdatedBanner}>
        <Alert
          severity="info"
          onClose={() => setPlanUpdatedBanner(false)}
          sx={{borderRadius: 0}}
        >
          Your plan was updated while you were offline — showing the latest version.
        </Alert>
      </Collapse>
      {view}
      {completionModal && (signalEnabled ? (
        <SignalCompletionSheet
          workout={completionModal.workout}
          weekWorkoutsCompleted={completionModal.done}
          weekWorkoutsTotal={completionModal.total}
          onClose={() => {
            setCompletionModal(null);
            navigateToWorkoutsList();
          }}
        />
      ) : (
        <WorkoutCompletionModal
          open={!!completionModal}
          onClose={() => {
            setCompletionModal(null);
            navigateToWorkoutsList();
          }}
          workout={completionModal.workout}
          weekWorkoutsCompleted={completionModal.done}
          weekWorkoutsTotal={completionModal.total}
        />
      ))}
      {selectedWeek && (
        <CompleteWeekModal
          open={completeWeekOpen}
          weekNumber={selectedWeek.order}
          done={selectedWeek.workouts.filter((workout) => workout.dateCompleted).length}
          total={selectedWeek.workouts.length}
          incompleteWorkoutNames={selectedWeek.workouts.filter((workout) => !workout.dateCompleted).map((workout) => workout.name)}
          onClose={() => setCompleteWeekOpen(false)}
        />
      )}
      <ExercisePickerDialog
        open={substituteTarget !== null}
        title="Substitute Exercise"
        defaultCategory={substituteTarget?.category}
        excludeExerciseId={substituteTarget?.exerciseId}
        onClose={() => setSubstituteTarget(null)}
        onSelect={handleSubstituteConfirm}
      />
      <ExercisePickerDialog
        open={showAddExercise}
        title="Add Exercise"
        onClose={() => setShowAddExercise(false)}
        onSelect={(exercise) => {
          setShowAddExercise(false);
          setPendingExercise(exercise);
        }}
      />
      <AddExerciseConfigDialog
        open={pendingExercise !== null}
        exercise={pendingExercise}
        onClose={() => setPendingExercise(null)}
        onConfirm={(config) => {
          if (pendingExercise) handleAddExercise(pendingExercise, config);
          setPendingExercise(null);
        }}
      />
    </StopwatchProvider>
  );
}
