import {describe, expect, it} from 'vitest';
import {ExerciseCategory} from '@/generated/prisma/browser';
import type {WorkoutExercisePrisma} from '@/types/dataTypes';
import {groupWorkoutExercises} from './groupWorkoutExercises';

function ex(overrides: Partial<WorkoutExercisePrisma>): WorkoutExercisePrisma {
  return {
    id: 1,
    workoutId: 1,
    exerciseId: 100,
    order: 1,
    repRange: '8-10',
    restTime: '90s',
    notes: '',
    targetRpe: null,
    targetRir: null,
    substitutedForId: null,
    substitutedFor: null,
    isAdded: false,
    isBfr: false,
    exercise: {
      id: 100,
      name: 'Bench Press',
      category: ExerciseCategory.resistance,
      description: null,
      equipment: [],
      primaryMuscles: [],
      secondaryMuscles: [],
      createdByUserId: null,
    },
    sets: [],
    cardioDuration: null,
    cardioDistance: null,
    cardioResistance: null,
    ...overrides,
  };
}

describe('groupWorkoutExercises', () => {
  it('groups duplicate exercise ids by compatible key', () => {
    const groups = groupWorkoutExercises([
      ex({id: 10, exerciseId: 100}),
      ex({id: 11, exerciseId: 100}),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map(item => item.id)).toEqual([10, 11]);
  });

  it('preserves original group order', () => {
    const groups = groupWorkoutExercises([
      ex({id: 10, exerciseId: 100}),
      ex({id: 20, exerciseId: 200, exercise: {...ex({}).exercise, id: 200, name: 'Row'}}),
      ex({id: 11, exerciseId: 100}),
    ]);

    expect(groups.map(group => group.exerciseId)).toEqual([100, 200]);
  });

  it('preserves item order inside each group', () => {
    const groups = groupWorkoutExercises([
      ex({id: 12, exerciseId: 100, order: 1}),
      ex({id: 14, exerciseId: 100, order: 3}),
      ex({id: 13, exerciseId: 100, order: 2}),
    ]);

    expect(groups[0].items.map(item => item.id)).toEqual([12, 14, 13]);
  });

  it('groups substituted and non-substituted variants by displayed exercise', () => {
    const groups = groupWorkoutExercises([
      ex({id: 10, exerciseId: 100, substitutedForId: null}),
      ex({id: 11, exerciseId: 100, substitutedForId: 999}),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map(item => item.id)).toEqual([10, 11]);
  });

  it('does not group cardio and resistance together', () => {
    const groups = groupWorkoutExercises([
      ex({id: 10, exerciseId: 100, exercise: {...ex({}).exercise, category: ExerciseCategory.cardio}}),
      ex({id: 11, exerciseId: 100, exercise: {...ex({}).exercise, category: ExerciseCategory.resistance}}),
    ]);

    expect(groups).toHaveLength(2);
  });
});
