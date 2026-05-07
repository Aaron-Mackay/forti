import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanSheetView from './PlanSheetView';
import { usePlanSheetContext } from './PlanSheetContext';

const dispatch = vi.fn();

vi.mock('@/context/WorkoutEditorContext', () => ({
  useWorkoutEditorContext: () => ({ dispatch, allExercises: [{ id: 99, name: 'Row', category: 'resistance' }] }),
}));

vi.mock('./PlanSheetExerciseMenu', () => ({ PlanSheetExerciseMenu: () => null }));

vi.mock('./PlanSheetBlocks', () => ({
  PlanSheetWeekBlock: ({
    week,
    maxWorkoutCount,
  }: {
    week: { id: number; workouts: Array<{ id: number; exercises: Array<{ id: number; sets: Array<{ id: number }> }> }> }
    maxWorkoutCount: number
  }) => {
    const { dispatch, planId, openPicker, openRenamePicker } = usePlanSheetContext();
    return (
      <div>
        <div>{`week-${week.id}`}</div>
        <div>{`slots-${maxWorkoutCount}`}</div>
        <button onClick={() => dispatch({ type: 'ADD_WORKOUT', planId, weekId: week.id })}>add-workout</button>
        <button onClick={() => openPicker(week.id, week.workouts[0].id)}>open-picker</button>
        <button onClick={() => openRenamePicker(week.id, week.workouts[0].id, week.workouts[0].exercises[0].id)}>open-rename</button>
        <button onClick={() => dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId: week.id, workoutId: week.workouts[0].id, exerciseId: week.workouts[0].exercises[0].id, setId: week.workouts[0].exercises[0].sets[0].id, weight: 100 })}>set-weight</button>
        <button onClick={() => dispatch({ type: 'UPDATE_SET_REPS', planId, weekId: week.id, workoutId: week.workouts[0].id, exerciseId: week.workouts[0].exercises[0].id, setId: week.workouts[0].exercises[0].sets[0].id, reps: 8 })}>set-reps</button>
      </div>
    );
  },
}));

vi.mock('@/app/user/workout/ExercisePickerDialog', () => ({
  default: ({ open, title, onSelect }: { open: boolean; title: string; onSelect: (exercise: { name: string; category: string }) => void }) => (
    open ? <button onClick={() => onSelect({ name: title === 'Add Exercise' ? 'Squat' : 'Bench', category: 'resistance' })}>{title}</button> : null
  ),
}));

function plan() {
  return {
    id: 77,
    weeks: [{
      id: 1,
      order: 1,
      workouts: [{
        id: 10,
        order: 1,
        name: 'W1',
        exercises: [{
          id: 100,
          order: 1,
          exercise: { id: 5, name: 'Press', category: 'resistance' },
          sets: [{ id: 1000, order: 1, weight: 80, reps: 5, isDropSet: false }],
          repRange: null,
          restTime: null,
          isBfr: false,
        }],
      }],
    }],
  } as never;
}

describe('PlanSheetView dispatch regression', () => {
  it('renders week blocks and dispatches expected payloads', () => {
    dispatch.mockClear();
    render(
      <PlanSheetView
        plan={plan()}
        planId={77}
        zoom={1}
        onZoomChange={vi.fn()}
        arrangeMode={false}
      />,
    );

    expect(screen.getByText('week-1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('add-workout'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_WORKOUT', planId: 77, weekId: 1 });

    fireEvent.click(screen.getByText('set-weight'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_SET_WEIGHT', planId: 77, weekId: 1, workoutId: 10, exerciseId: 100, setId: 1000, weight: 100 });

    fireEvent.click(screen.getByText('set-reps'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_SET_REPS', planId: 77, weekId: 1, workoutId: 10, exerciseId: 100, setId: 1000, reps: 8 });

    fireEvent.click(screen.getByText('open-picker'));
    fireEvent.click(screen.getByText('Add Exercise'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_EXERCISE_WITH_SET_FOR_EXERCISE', planId: 77, weekId: 1, workoutId: 10, exercise: { name: 'Squat', category: 'resistance' } });

    fireEvent.click(screen.getByText('open-rename'));
    fireEvent.click(screen.getByText('Change Exercise'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_EXERCISE',
      planId: 77,
      weekId: 1,
      workoutId: 10,
      workoutExerciseId: 100,
      exerciseName: 'Bench',
      exercises: [{ id: 99, name: 'Row', category: 'resistance' }],
      category: 'resistance',
    });
  });
});
