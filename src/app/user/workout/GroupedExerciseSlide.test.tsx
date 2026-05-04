import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {WorkoutExercisePrisma} from '@/types/dataTypes';
import type {ExerciseCategory} from '@/generated/prisma/browser';
import GroupedExerciseSlide from './GroupedExerciseSlide';
import type {WorkoutExerciseGroup} from './groupWorkoutExercises';

vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: {
      weightUnit: 'kg',
      effortMetric: 'none',
      showPlateCalculator: false,
      exerciseUnitOverrides: {},
    },
  }),
}));

vi.mock('@/components/fitness/MuscleHighlight', () => ({
  default: () => <div data-testid="muscle-highlight" />,
}));
vi.mock('./WorkoutExerciseSetSection', () => ({default: () => <div data-testid="set-section" />}));
vi.mock('./CardioInputsSection', () => ({default: () => <div data-testid="cardio-section" />}));
vi.mock('./E1rmSparkline', () => ({
  default: ({history}: {history: Array<unknown> | null}) => (
    <div data-testid="e1rm-sparkline">{history && history.length > 0 ? 'sparkline' : 'none'}</div>
  ),
}));
function buildExercise(id: number): WorkoutExercisePrisma {
  return {
    id,
    workoutId: 1,
    exerciseId: 100,
    order: id,
    repRange: '10-15',
    restTime: '120',
    notes: null,
    isAdded: false,
    substitutedForId: null,
    substitutedFor: null,
    targetRpe: null,
    targetRir: null,
    isBfr: false,
    cardioDuration: null,
    cardioDistance: null,
    cardioResistance: null,
    exercise: {
      id: 100,
      name: 'Lying Hamstring Curl',
      category: 'resistance' as ExerciseCategory,
      description: null,
      equipment: [],
      primaryMuscles: [],
      secondaryMuscles: [],
      createdByUserId: null,
    },
    sets: [
      {id: id * 10, workoutExerciseId: id, order: 1, reps: null, weight: null, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
    ],
  };
}

function buildGroup(): WorkoutExerciseGroup {
  const first = buildExercise(1);
  return {
    key: '100:resistance',
    exerciseId: first.exerciseId,
    exercise: first.exercise,
    items: [first, buildExercise(2)],
  };
}

describe('GroupedExerciseSlide', () => {
  it('shows nothing for notes/e1rm panels until a tab is selected', () => {
    render(
      <GroupedExerciseSlide
        group={buildGroup()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        history={[{date: '2025-02-10T00:00:00.000Z', bestE1rm: 200}]}
        previousSetsMap={new Map()}
        onSubstituteExercise={vi.fn()}
        onRemoveExercise={vi.fn()}
        onCardioUpdate={vi.fn()}
      />,
    );

    expect(screen.queryByPlaceholderText(/add form cues and notes for this exercise/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('e1rm-sparkline')).not.toBeInTheDocument();
  });

  it('toggles selected tab off and keeps only one panel active at a time', () => {
    render(
      <GroupedExerciseSlide
        group={buildGroup()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        history={[{date: '2025-02-10T00:00:00.000Z', bestE1rm: 200}]}
        previousSetsMap={new Map()}
        onSubstituteExercise={vi.fn()}
        onRemoveExercise={vi.fn()}
        onCardioUpdate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', {name: /notes/i}));
    expect(screen.getByPlaceholderText(/add form cues and notes for this exercise/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', {name: /progress/i}));
    expect(screen.getByTestId('e1rm-sparkline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', {name: /progress/i}));
    expect(screen.queryByTestId('e1rm-sparkline')).not.toBeVisible();
  });

  it('shows previous workout tables behind the history tab', () => {
    render(
      <GroupedExerciseSlide
        group={buildGroup()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        history={[]}
        previousSetsMap={new Map([[1, {workouts: [{completedAt: '2026-01-14T12:00:00.000Z', sets: [{order: 1, weight: 80, reps: 8, e1rm: 101.3}]}]}]])}
        onSubstituteExercise={vi.fn()}
        onRemoveExercise={vi.fn()}
        onCardioUpdate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', {name: /history/i}));

    expect(screen.getByLabelText('Previous workout table 1')).toBeInTheDocument();
    expect(screen.getByText('Jan 14, 2026')).toBeInTheDocument();
  });

  it('shows an empty state in history when no previous workout data exists', () => {
    render(
      <GroupedExerciseSlide
        group={buildGroup()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        history={[]}
        previousSetsMap={new Map()}
        onSubstituteExercise={vi.fn()}
        onRemoveExercise={vi.fn()}
        onCardioUpdate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', {name: /history/i}));

    expect(screen.getByText('No previous workouts yet')).toBeInTheDocument();
  });

});
