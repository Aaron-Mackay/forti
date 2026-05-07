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

vi.mock('@/components/fitness/MuscleHighlight', () => ({
  default: () => <div data-testid="muscle-highlight" />,
}));
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
      createdByUserId: null,
    },
    sets: [
      {id: 1, workoutExerciseId: 10, order: 1, reps: null, weight: null, e1rm: null, rpe: null, rir: null, isDropSet: false, parentSetId: null},
    ],
  };
}

describe('ExerciseSlide', () => {
  it('shows an empty state in history when no previous workout history exists', () => {
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

    fireEvent.click(screen.getByRole('tab', {name: /history/i}));

    expect(screen.getByText('No previous workouts yet')).toBeInTheDocument();
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

  it('renders no notes or e1rm content until a tab is selected', () => {
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

    expect(screen.queryByPlaceholderText(/add form cues and notes for this exercise/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('e1rm-sparkline')).not.toBeInTheDocument();
  });

  it('toggles e1rm history behind a tab trigger', async () => {
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

    expect(screen.queryByTestId('e1rm-sparkline')).not.toBeInTheDocument();

    const progressTab = screen.getByRole('tab', {name: /progress/i});
    fireEvent.click(progressTab);

    await waitFor(() => {
      expect(progressTab).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByTestId('e1rm-sparkline')).toBeInTheDocument();

    fireEvent.click(progressTab);

    await waitFor(() => {
      expect(screen.queryByTestId('e1rm-sparkline')).not.toBeInTheDocument();
    });
  });

  it('switches between notes and e1rm panels with one active tab at a time', async () => {
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

    fireEvent.click(screen.getByRole('tab', {name: /notes/i}));
    expect(screen.getByPlaceholderText(/add form cues and notes for this exercise/i)).toBeInTheDocument();
    expect(screen.queryByTestId('e1rm-sparkline')).not.toBeInTheDocument();

    const progressTab = screen.getByRole('tab', {name: /progress/i});
    fireEvent.click(progressTab);
    await waitFor(() => {
      expect(progressTab).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByTestId('e1rm-sparkline')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/add form cues and notes for this exercise/i)).not.toBeInTheDocument();
  });

  it('shows the muscles panel with a width-driven aspect ratio wrapper', async () => {
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

    fireEvent.click(screen.getByRole('tab', {name: /muscles/i}));

    await waitFor(() => {
      expect(screen.getByTestId('muscle-highlight')).toBeInTheDocument();
    });

    const wrapper = screen.getByTestId('muscle-highlight').parentElement;
    expect(wrapper).toHaveStyle({width: '100%', maxWidth: '240px'});
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

    const historyTab = screen.getByRole('tab', {name: /history/i});
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(historyTab).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByLabelText('Previous workout table 1')).toBeInTheDocument();
    expect(screen.getByText('Jan 14, 2026')).toBeInTheDocument();
    expect(screen.getByText('Jan 7, 2026')).toBeInTheDocument();
    expect(screen.getByText('106.7')).toBeInTheDocument();
  });
});
