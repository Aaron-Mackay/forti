import {render, screen} from '@testing-library/react';
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
  default: () => <div data-testid="weight-input" />,
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
  it('hides previous-set row when no previous workout history exists', () => {
    render(
      <ExerciseSlide
        ex={buildExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={vi.fn()}
        handleSetUpdate={vi.fn()}
        handleEffortUpdate={vi.fn()}
        previousSets={[]}
        history={[]}
      />,
    );

    expect(screen.queryByText(/Prev:/i)).not.toBeInTheDocument();
  });
});
