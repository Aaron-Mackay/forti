'use client';

import {useSearchParams} from 'next/navigation';
import {useWorkoutSession} from './useWorkoutSession';
import {UserPrisma} from '@/types/dataTypes';

import WeeksListView from './WeeksListView';
import WorkoutsListView from './WorkoutsListView';
import ExercisesListView from './ExercisesListView';
import ExerciseDetailView from './ExerciseDetailView';
import ExercisePickerDialog from './ExercisePickerDialog';
import AddExerciseConfigDialog from './AddExerciseConfigDialog';
import PlansListView from '@/app/user/workout/PlansListView';
import WorkoutCompletionModal from '@/app/user/workout/WorkoutCompletionModal';
import {StopwatchProvider} from '@/app/user/workout/StopwatchContext';
import {Alert, Collapse} from '@mui/material';

export default function WorkoutClient({userData}: {userData: UserPrisma}) {
  const searchParams = useSearchParams();
  const workoutIdParam = searchParams.get('workoutId');
  const initialWorkoutId = workoutIdParam ? Number(workoutIdParam) : null;

  const {
    userDataState,
    setSelectedPlanId,
    setSelectedWeekId,
    setSelectedWorkoutId,
    selectedExerciseId, setSelectedExerciseId,
    selectedPlan, selectedWeek, selectedWorkout,
    completionModal, setCompletionModal,
    snackbar,
    planUpdatedBanner, setPlanUpdatedBanner,
    substituteTarget, setSubstituteTarget,
    showAddExercise, setShowAddExercise,
    pendingExercise, setPendingExercise,
    goBack,
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
  } = useWorkoutSession(userData, initialWorkoutId);

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
        handleEffortUpdate={handleEffortUpdate}
        onFormCueBlur={handleFormCueBlur}
        onCardioUpdate={handleCardioUpdate}
        onSubstituteExercise={handleSubstituteExercise}
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
        onAddExercise={() => setShowAddExercise(true)}
        onRemoveExercise={handleRemoveExercise}
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
      {completionModal && (
        <WorkoutCompletionModal
          open={!!completionModal}
          onClose={() => setCompletionModal(null)}
          workout={completionModal.workout}
          weekWorkoutsCompleted={completionModal.done}
          weekWorkoutsTotal={completionModal.total}
        />
      )}
      <ExercisePickerDialog
        open={substituteTarget !== null}
        title="Substitute Exercise"
        defaultCategory={substituteTarget?.category}
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
