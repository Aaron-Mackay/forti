import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import CardioSlide from './CardioSlide';
import {ExerciseCategory} from '@prisma/client';
import {WorkoutExercisePrisma} from '@/types/dataTypes';

function buildCardioExercise(overrides: Partial<WorkoutExercisePrisma> = {}): WorkoutExercisePrisma {
  return {
    id: 10,
    workoutId: 1,
    exerciseId: 100,
    order: 1,
    repRange: null,
    restTime: null,
    notes: null,
    exercise: {
      id: 100,
      name: 'Treadmill',
      category: ExerciseCategory.cardio,
      description: null,
      equipment: [],
      primaryMuscles: [],
      secondaryMuscles: [],
    },
    sets: [],
    cardioDuration: null,
    cardioDistance: null,
    cardioResistance: null,
    ...overrides,
  };
}

describe('CardioSlide', () => {
  const onFormCueBlur = vi.fn();
  const onCardioUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the exercise name', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={undefined}
      />
    );
    expect(screen.getByText('Treadmill')).toBeInTheDocument();
  });

  it('renders duration, distance, and resistance inputs', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={undefined}
      />
    );
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resistance/i)).toBeInTheDocument();
  });

  it('displays current cardioDuration value in input', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise({cardioDuration: 30})}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={undefined}
      />
    );
    expect(screen.getByLabelText(/duration/i)).toHaveValue('30');
  });

  it('calls onCardioUpdate with cardioDuration when duration input changes', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={undefined}
      />
    );
    fireEvent.change(screen.getByLabelText(/duration/i), {target: {value: '45'}});
    expect(onCardioUpdate).toHaveBeenCalledWith('cardioDuration', 45);
  });

  it('calls onCardioUpdate with null when duration input is cleared', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise({cardioDuration: 30})}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={undefined}
      />
    );
    fireEvent.change(screen.getByLabelText(/duration/i), {target: {value: ''}});
    expect(onCardioUpdate).toHaveBeenCalledWith('cardioDuration', null);
  });

  it('computes and displays pace when both duration and distance are set', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise({cardioDuration: 30, cardioDistance: 5})}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={undefined}
      />
    );
    // 30 min / 5 km = 6:00 /km
    expect(screen.getByText(/6:00 \/km/)).toBeInTheDocument();
  });

  it('does not show pace when only duration is set', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise({cardioDuration: 30, cardioDistance: null})}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={undefined}
      />
    );
    expect(screen.queryByText(/\/km/)).not.toBeInTheDocument();
  });

  it('shows previous session summary when previousCardio is provided', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={{cardioDuration: 25, cardioDistance: 4, cardioResistance: null}}
      />
    );
    expect(screen.getByText(/Last session: 25 min · 4 km/)).toBeInTheDocument();
  });

  it('shows only duration in previous summary when distance is null', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={{cardioDuration: 20, cardioDistance: null, cardioResistance: null}}
      />
    );
    expect(screen.getByText(/Last session: 20 min/)).toBeInTheDocument();
  });

  it('does not show previous session when previousCardio is null', () => {
    render(
      <CardioSlide
        ex={buildCardioExercise()}
        userExerciseNote={undefined}
        onFormCueBlur={onFormCueBlur}
        onCardioUpdate={onCardioUpdate}
        previousCardio={null}
      />
    );
    expect(screen.queryByText(/Last session/)).not.toBeInTheDocument();
  });
});
