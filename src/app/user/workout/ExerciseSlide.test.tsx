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
vi.mock('./E1rmSparkline', () => ({default: () => null}));
vi.mock('./PlateCalculatorSheet', () => ({default: () => null}));
vi.mock('./WeightInput', () => ({
  default: ({label, unit}: {label?: string; unit: 'kg' | 'lb' | 'none'}) => (
    <div data-testid="weight-input">{label ?? (unit === 'none' ? 'Weight' : unit)}</div>
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
        previousWorkout={{completedAt: null, sets: []}}
        history={[]}
      />,
    );

    expect(screen.queryByRole('button', {name: /previous workout/i})).not.toBeInTheDocument();
  });

  it('renders the shortened default weight label and unitless e1rm label', () => {
    render(
      <ExerciseSlide
        ex={buildExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        previousWorkout={{completedAt: null, sets: []}}
        history={[]}
      />,
    );

    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByLabelText('Est. 1RM')).toBeInTheDocument();
  });

  it('shows a collapsible previous workout table when history exists', async () => {
    render(
      <ExerciseSlide
        ex={buildExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        previousWorkout={{
          completedAt: '2026-01-14T12:00:00.000Z',
          sets: [{order: 1, weight: 80, reps: 10, e1rm: 106.7}],
        }}
        history={[]}
      />,
    );

    expect(screen.getByRole('button', {name: /previous workout/i})).toBeInTheDocument();
    expect(screen.getByLabelText('Previous workout table')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', {name: /previous workout/i}));

    await waitFor(() => {
      expect(screen.getByLabelText('Previous workout table')).toBeVisible();
    });
    expect(screen.getByText('Jan 14, 2026')).toBeInTheDocument();
    expect(screen.getByText('106.7')).toBeInTheDocument();
  });
});
