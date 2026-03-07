import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';

vi.mock('next-auth/react', () => ({useSession: () => ({data: null, status: 'unauthenticated'})}));
vi.mock('next/navigation', () => ({usePathname: () => '/user/workout', useRouter: () => ({push: vi.fn()})}));
vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({settings: {showStopwatch: true}, loading: false, error: null, clearError: vi.fn(), updateSetting: vi.fn()}),
}));

import ExercisesListView from './ExercisesListView';
import {StopwatchProvider} from './StopwatchContext';
import {ExerciseCategory} from '@prisma/client';
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
          {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: 100, e1rm: null},
          {id: 2, workoutExerciseId: 10, order: 2, reps: null, weight: null, e1rm: null},
        ],
      },
    ],
    ...overrides,
  };
}

function renderView(props: React.ComponentProps<typeof ExercisesListView>) {
  return render(
    <StopwatchProvider>
      <ExercisesListView {...props}/>
    </StopwatchProvider>
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
});
