import React from 'react';
import {render, screen, fireEvent, act} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {LocalizationProvider} from '@mui/x-date-pickers';
import {AdapterDateFns} from '@mui/x-date-pickers/AdapterDateFns';

vi.mock('next-auth/react', () => ({useSession: () => ({data: null, status: 'unauthenticated'})}));
vi.mock('next/navigation', () => ({usePathname: () => '/user/workout', useRouter: () => ({push: vi.fn()})}));
vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({settings: {showStopwatch: true}, loading: false, error: null, clearError: vi.fn(), updateSetting: vi.fn()}),
}));
vi.mock('@lib/providers/AppBarProvider', () => ({ useAppBar: vi.fn() }));

import ExercisesListView from './ExercisesListView';
import {StopwatchProvider} from './StopwatchContext';
import {ExerciseCategory} from '@/generated/prisma/browser';
import {WorkoutPrisma, WorkoutExercisePrisma} from '@/types/dataTypes';

const baseExercise = (overrides: Partial<WorkoutExercisePrisma> = {}): WorkoutExercisePrisma => ({
  id: 10,
  workoutId: 1,
  exerciseId: 100,
  order: 1,
  repRange: '8-12',
  restTime: '90s',
  notes: '',
  targetRpe: null,
  targetRir: null,
  substitutedForId: null,
  substitutedFor: null,
  isAdded: false,
  isBfr: false,
  exercise: {id: 100, name: 'Bench Press', category: ExerciseCategory.resistance, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
  sets: [
    {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: 100, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
    {id: 2, workoutExerciseId: 10, order: 2, reps: null, weight: null, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
  ],
  cardioDuration: null,
  cardioDistance: null,
  cardioResistance: null,
  ...overrides,
});

function buildWorkout(overrides: Partial<WorkoutPrisma> = {}): WorkoutPrisma {
  return {
    id: 1,
    weekId: 1,
    name: 'Push Day',
    order: 1,
    notes: '',
    dateCompleted: null,
    exercises: [baseExercise()],
    ...overrides,
  };
}

function renderView(props: React.ComponentProps<typeof ExercisesListView>) {
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <StopwatchProvider>
        <ExercisesListView {...props}/>
      </StopwatchProvider>
    </LocalizationProvider>
  );
}

describe('ExercisesListView', () => {
  const onBack = vi.fn();
  const onSelectExercise = vi.fn();
  const onWorkoutNoteBlur = vi.fn();
  const onCompleteWorkout = vi.fn();
  const onAddExercise = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders exercise names', () => {
    renderView({workout: buildWorkout(), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('shows "Mark as Complete" button when workout is not completed', () => {
    renderView({workout: buildWorkout({dateCompleted: null}), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    expect(screen.getByRole('button', {name: /mark as complete/i})).toBeInTheDocument();
  });

  it('shows completed date when workout is already completed', () => {
    const date = new Date('2024-06-15T00:00:00.000Z');
    renderView({workout: buildWorkout({dateCompleted: date}), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    expect(screen.getByRole('button', {name: /completed/i})).toBeInTheDocument();
  });

  it('calls onCompleteWorkout(true) when clicking Mark as Complete', () => {
    renderView({workout: buildWorkout({dateCompleted: null}), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    fireEvent.click(screen.getByRole('button', {name: /mark as complete/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(true);
  });

  it('calls onCompleteWorkout(false) when clicking to uncomplete', () => {
    renderView({workout: buildWorkout({dateCompleted: new Date()}), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    fireEvent.click(screen.getByRole('button', {name: /completed/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(false);
  });

  it('calls onSelectExercise when clicking an exercise', () => {
    renderView({workout: buildWorkout(), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    fireEvent.click(screen.getByText('Bench Press'));
    expect(onSelectExercise).toHaveBeenCalledWith(10);
  });

  it('shows rep range and rest time on the second line', () => {
    renderView({workout: buildWorkout(), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    expect(screen.getByText('8-12 · 90s')).toBeInTheDocument();
  });

  it('shows nothing on the second line when repRange and restTime are both null', () => {
    renderView({
      workout: buildWorkout({exercises: [baseExercise({repRange: null, restTime: null})]}),
      onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise,
    });
    // No meta text — no separator dot should appear
    expect(screen.queryByText(' · ')).not.toBeInTheDocument();
  });

  it('shows cardio summary text when cardio exercise has duration and distance logged', () => {
    renderView({
      workout: buildWorkout({exercises: [baseExercise({
        id: 20, exerciseId: 200,
        exercise: {id: 200, name: 'Treadmill', category: ExerciseCategory.cardio, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
        sets: [], repRange: null, restTime: null, cardioDuration: 30, cardioDistance: 5,
      })]}),
      onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise,
    });
    expect(screen.getByText('30 min · 5 km')).toBeInTheDocument();
  });

  it('shows only duration in cardio summary when distance is null', () => {
    renderView({
      workout: buildWorkout({exercises: [baseExercise({
        id: 20, exerciseId: 200,
        exercise: {id: 200, name: 'Treadmill', category: ExerciseCategory.cardio, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
        sets: [], repRange: null, restTime: null, cardioDuration: 45, cardioDistance: null,
      })]}),
      onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise,
    });
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('shows delete button for an added exercise', () => {
    const onRemoveExercise = vi.fn();
    renderView({
      workout: buildWorkout({exercises: [baseExercise({
        id: 10, exerciseId: 101, isAdded: true, substitutedForId: 100,
        exercise: {id: 101, name: 'Incline Press', category: ExerciseCategory.resistance, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
        sets: [],
      })]}),
      onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise, onRemoveExercise,
    });
    expect(screen.getByRole('button', {name: /remove exercise/i})).toBeInTheDocument();
  });

  it('shows empty circle for cardio exercise with no data logged', () => {
    renderView({
      workout: buildWorkout({exercises: [baseExercise({
        id: 20, exerciseId: 200,
        exercise: {id: 200, name: 'Treadmill', category: ExerciseCategory.cardio, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
        sets: [], repRange: null, restTime: null, cardioDuration: null, cardioDistance: null,
      })]}),
      onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise,
    });
    // PanoramaFishEye icon rendered as svg
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    expect(screen.getByText('Treadmill')).toBeInTheDocument();
  });

  it('opens date picker dialog on long press of Mark as Complete', async () => {
    vi.useFakeTimers();
    renderView({workout: buildWorkout({dateCompleted: null}), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    const btn = screen.getByRole('button', {name: /mark as complete/i});
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(650); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Complete Workout')).toBeInTheDocument();
  });

  it('calls onCompleteWorkout with true and a Date on dialog confirm', async () => {
    vi.useFakeTimers();
    renderView({workout: buildWorkout({dateCompleted: null}), onBack, onSelectExercise, onWorkoutNoteBlur, onCompleteWorkout, onAddExercise});
    const btn = screen.getByRole('button', {name: /mark as complete/i});
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(650); });
    // Confirm with the pre-filled date
    fireEvent.click(screen.getByRole('button', {name: /^complete$/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(true, expect.any(Date));
  });
});
