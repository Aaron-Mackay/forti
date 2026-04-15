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
import {WorkoutPrisma} from '@/types/dataTypes';

function buildWorkout(overrides: Partial<WorkoutPrisma> = {}): WorkoutPrisma {
  return {
    id: 1,
    weekId: 1,
    name: 'Push Day',
    order: 1,
    notes: '',
    dateCompleted: null,
    exercises: [
      {
        id: 10,
        workoutId: 1,
        exerciseId: 100,
        order: 1,
        repRange: '8-12',
        restTime: '90s',
        notes: '',
        exercise: {id: 100, name: 'Bench Press', category: ExerciseCategory.resistance, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: []},
        sets: [
          {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: 100, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
          {id: 2, workoutExerciseId: 10, order: 2, reps: null, weight: null, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
        ],
        cardioDuration: null,
        cardioDistance: null,
        cardioResistance: null,
      },
    ],
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders exercise names', () => {
    renderView({
      workout: buildWorkout(),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('shows "Mark as Complete" button when workout is not completed', () => {
    renderView({
      workout: buildWorkout({dateCompleted: null}),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    expect(screen.getByRole('button', {name: /mark as complete/i})).toBeInTheDocument();
  });

  it('shows completed date when workout is already completed', () => {
    const date = new Date('2024-06-15T00:00:00.000Z');
    renderView({
      workout: buildWorkout({dateCompleted: date}),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    expect(screen.getByRole('button', {name: /completed/i})).toBeInTheDocument();
  });

  it('calls onCompleteWorkout(true) when clicking Mark as Complete', () => {
    renderView({
      workout: buildWorkout({dateCompleted: null}),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    fireEvent.click(screen.getByRole('button', {name: /mark as complete/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(true);
  });

  it('calls onCompleteWorkout(false) when clicking to uncomplete', () => {
    renderView({
      workout: buildWorkout({dateCompleted: new Date()}),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    fireEvent.click(screen.getByRole('button', {name: /completed/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(false);
  });

  it('calls onSelectExercise when clicking an exercise', () => {
    renderView({
      workout: buildWorkout(),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    fireEvent.click(screen.getByText('Bench Press'));
    expect(onSelectExercise).toHaveBeenCalledWith(10);
  });

  it('shows cardio summary text when cardio exercise has duration and distance logged', () => {
    const cardioWorkout = buildWorkout({
      exercises: [
        {
          id: 20,
          workoutId: 1,
          exerciseId: 200,
          order: 1,
          repRange: null,
          restTime: null,
          notes: null,
          exercise: {id: 200, name: 'Treadmill', category: ExerciseCategory.cardio, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: []},
          sets: [],
          cardioDuration: 30,
          cardioDistance: 5,
          cardioResistance: null,
        },
      ],
    });
    renderView({
      workout: cardioWorkout,
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    expect(screen.getByText('30 min · 5 km')).toBeInTheDocument();
  });

  it('shows only duration in cardio summary when distance is null', () => {
    const cardioWorkout = buildWorkout({
      exercises: [
        {
          id: 20,
          workoutId: 1,
          exerciseId: 200,
          order: 1,
          repRange: null,
          restTime: null,
          notes: null,
          exercise: {id: 200, name: 'Treadmill', category: ExerciseCategory.cardio, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: []},
          sets: [],
          cardioDuration: 45,
          cardioDistance: null,
          cardioResistance: null,
        },
      ],
    });
    renderView({
      workout: cardioWorkout,
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('shows delete button for an added exercise that has been substituted', () => {
    const onRemoveExercise = vi.fn();
    const workout = buildWorkout({
      exercises: [
        {
          id: 10,
          workoutId: 1,
          exerciseId: 101,
          order: 1,
          repRange: '8-12',
          restTime: '90s',
          notes: '',
          isAdded: true,
          substitutedForId: 100,
          exercise: {id: 101, name: 'Incline Press', category: ExerciseCategory.resistance, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: []},
          sets: [],
          cardioDuration: null,
          cardioDistance: null,
          cardioResistance: null,
        },
      ],
    });
    renderView({
      workout,
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
      onRemoveExercise,
    });
    expect(screen.getByRole('button', {name: /remove exercise/i})).toBeInTheDocument();
  });

  it('shows empty circle for cardio exercise with no data logged', () => {
    const cardioWorkout = buildWorkout({
      exercises: [
        {
          id: 20,
          workoutId: 1,
          exerciseId: 200,
          order: 1,
          repRange: null,
          restTime: null,
          notes: null,
          exercise: {id: 200, name: 'Treadmill', category: ExerciseCategory.cardio, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: []},
          sets: [],
          cardioDuration: null,
          cardioDistance: null,
          cardioResistance: null,
        },
      ],
    });
    renderView({
      workout: cardioWorkout,
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    // PanoramaFishEye icon rendered as svg
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    expect(screen.getByText('Treadmill')).toBeInTheDocument();
  });

  it('opens date picker dialog on long press of Mark as Complete', async () => {
    vi.useFakeTimers();
    renderView({
      workout: buildWorkout({dateCompleted: null}),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    const btn = screen.getByRole('button', {name: /mark as complete/i});
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(650); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Complete Workout')).toBeInTheDocument();
  });

  it('calls onCompleteWorkout with true and a Date on dialog confirm', async () => {
    vi.useFakeTimers();
    renderView({
      workout: buildWorkout({dateCompleted: null}),
      onBack,
      onSelectExercise,
      onWorkoutNoteBlur,
      onCompleteWorkout,
    });
    const btn = screen.getByRole('button', {name: /mark as complete/i});
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(650); });
    // Confirm with the pre-filled date
    fireEvent.click(screen.getByRole('button', {name: /^complete$/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(true, expect.any(Date));
  });
});
