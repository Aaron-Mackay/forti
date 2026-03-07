import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';

vi.mock('next-auth/react', () => ({useSession: () => ({data: null, status: 'unauthenticated'})}));
vi.mock('next/navigation', () => ({usePathname: () => '/user/workout', useRouter: () => ({push: vi.fn()})}));

import ExercisesListView from './ExercisesListView';
import {ExerciseCategory} from '@prisma/client';
import {WorkoutPrisma} from '@/types/dataTypes';

const stopwatchProps = {
  stopwatchIsRunning: false,
  stopwatchStartTimestamp: null,
  stopwatchPausedTime: 0,
  onStopwatchStartStop: vi.fn(),
  onStopwatchReset: vi.fn(),
  isStopwatchVisible: false,
  setIsStopwatchVisible: vi.fn(),
};

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
          {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: 100},
          {id: 2, workoutExerciseId: 10, order: 2, reps: null, weight: null},
        ],
      },
    ],
    ...overrides,
  };
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
    render(
      <ExercisesListView
        workout={buildWorkout()}
        onBack={onBack}
        onSelectExercise={onSelectExercise}
        onWorkoutNoteBlur={onWorkoutNoteBlur}
        onCompleteWorkout={onCompleteWorkout}
        {...stopwatchProps}
      />
    );
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('shows "Mark as Complete" button when workout is not completed', () => {
    render(
      <ExercisesListView
        workout={buildWorkout({dateCompleted: null})}
        onBack={onBack}
        onSelectExercise={onSelectExercise}
        onWorkoutNoteBlur={onWorkoutNoteBlur}
        onCompleteWorkout={onCompleteWorkout}
        {...stopwatchProps}
      />
    );
    expect(screen.getByRole('button', {name: /mark as complete/i})).toBeInTheDocument();
  });

  it('shows completed date when workout is already completed', () => {
    const date = new Date('2024-06-15T00:00:00.000Z');
    render(
      <ExercisesListView
        workout={buildWorkout({dateCompleted: date})}
        onBack={onBack}
        onSelectExercise={onSelectExercise}
        onWorkoutNoteBlur={onWorkoutNoteBlur}
        onCompleteWorkout={onCompleteWorkout}
        {...stopwatchProps}
      />
    );
    expect(screen.getByRole('button', {name: /completed/i})).toBeInTheDocument();
  });

  it('calls onCompleteWorkout(true) when clicking Mark as Complete', () => {
    render(
      <ExercisesListView
        workout={buildWorkout({dateCompleted: null})}
        onBack={onBack}
        onSelectExercise={onSelectExercise}
        onWorkoutNoteBlur={onWorkoutNoteBlur}
        onCompleteWorkout={onCompleteWorkout}
        {...stopwatchProps}
      />
    );
    fireEvent.click(screen.getByRole('button', {name: /mark as complete/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(true);
  });

  it('calls onCompleteWorkout(false) when clicking to uncomplete', () => {
    render(
      <ExercisesListView
        workout={buildWorkout({dateCompleted: new Date()})}
        onBack={onBack}
        onSelectExercise={onSelectExercise}
        onWorkoutNoteBlur={onWorkoutNoteBlur}
        onCompleteWorkout={onCompleteWorkout}
        {...stopwatchProps}
      />
    );
    fireEvent.click(screen.getByRole('button', {name: /completed/i}));
    expect(onCompleteWorkout).toHaveBeenCalledWith(false);
  });

  it('calls onSelectExercise when clicking an exercise', () => {
    render(
      <ExercisesListView
        workout={buildWorkout()}
        onBack={onBack}
        onSelectExercise={onSelectExercise}
        onWorkoutNoteBlur={onWorkoutNoteBlur}
        onCompleteWorkout={onCompleteWorkout}
        {...stopwatchProps}
      />
    );
    fireEvent.click(screen.getByText('Bench Press'));
    expect(onSelectExercise).toHaveBeenCalledWith(10);
  });
});
