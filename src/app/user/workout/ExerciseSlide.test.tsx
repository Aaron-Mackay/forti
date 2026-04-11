import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {WorkoutExercisePrisma} from '@/types/dataTypes';
import type {ExerciseCategory} from '@/generated/prisma/browser';
import ExerciseSlide from './ExerciseSlide';

vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: {
      weightUnit: 'kg',
      effortMetric: 'none',
      exerciseUnitOverrides: {},
    },
    setExerciseUnitOverride: vi.fn(),
  }),
}));

vi.mock('@/components/MuscleHighlight', () => ({default: () => null}));
vi.mock('./E1rmSparkline', () => ({
  default: ({history}: {history: Array<unknown> | null}) => (
    <div data-testid="e1rm-sparkline">{history && history.length > 0 ? 'sparkline' : 'Log a weighted set to start tracking'}</div>
  ),
}));
vi.mock('./PlateCalculatorSheet', () => ({default: () => null}));
vi.mock('./WeightInput', () => ({
  default: ({label, unit, ariaLabel, visibleLabel = true}: {label?: string; unit: 'kg' | 'lb' | 'none'; ariaLabel?: string; visibleLabel?: boolean}) => (
    <div aria-label={ariaLabel ?? label ?? (unit === 'none' ? 'Weight' : unit)} data-testid="weight-input">
      {visibleLabel ? (label ?? (unit === 'none' ? 'Weight' : unit)) : null}
    </div>
  ),
}));

function buildExercise(): WorkoutExercisePrisma {
  return {
    id: 10,
    workoutId: 1,
    exerciseId: 100,
    order: 1,
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
    },
    sets: [
      {id: 1, workoutExerciseId: 10, order: 1, reps: null, weight: null, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
    ],
  };
}

describe('ExerciseSlide', () => {
  it('does not render previous workout controls when no previous workout history exists', () => {
    render(
      <ExerciseSlide
        ex={buildExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        previousWorkout={{workouts: []}}
        history={[]}
      />,
    );

    expect(screen.queryByRole('button', {name: /previous workouts/i})).not.toBeInTheDocument();
  });

  it('renders a shared header row with unit and e1rm columns', () => {
    render(
      <ExerciseSlide
        ex={buildExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        previousWorkout={{workouts: []}}
        history={[]}
      />,
    );

    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Est. 1RM')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight set 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps set 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Est. 1RM set 1')).toBeInTheDocument();
  });

  it('toggles e1rm history behind a text trigger', async () => {
    render(
      <ExerciseSlide
        ex={buildExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        previousWorkout={{workouts: []}}
        history={[{date: '2025-02-10T00:00:00.000Z', bestE1rm: 200}]}
      />,
    );

    expect(screen.getByText('Personal Best E1RM: 200.0')).toBeInTheDocument();
    expect(screen.getByTestId('e1rm-sparkline')).not.toBeVisible();

    fireEvent.click(screen.getByText('Est. 1RM history'));

    await waitFor(() => {
      expect(screen.getByTestId('e1rm-sparkline')).toBeVisible();
    });
  });

  it('shows an accordion with up to three previous workout tables below the set list', async () => {
    render(
      <ExerciseSlide
        ex={buildExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        previousWorkout={{
          workouts: [
            {
              completedAt: '2026-01-14T12:00:00.000Z',
              sets: [{order: 1, weight: 80, reps: 10, e1rm: 106.7}],
            },
            {
              completedAt: '2026-01-07T12:00:00.000Z',
              sets: [{order: 1, weight: 77.5, reps: 9, e1rm: 100.8}],
            },
          ],
        }}
        history={[]}
      />,
    );

    expect(screen.getByRole('button', {name: /previous workouts/i})).toBeInTheDocument();
    expect(screen.getByLabelText('Previous workout table 1')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', {name: /previous workouts/i}));

    await waitFor(() => {
      expect(screen.getByLabelText('Previous workout table 1')).toBeVisible();
    });
    expect(screen.getByText('Jan 14, 2026')).toBeInTheDocument();
    expect(screen.getByText('Jan 7, 2026')).toBeInTheDocument();
    expect(screen.getByText('106.7')).toBeInTheDocument();
  });
});
