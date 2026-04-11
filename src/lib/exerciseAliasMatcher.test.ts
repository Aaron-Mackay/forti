import { describe, it, expect } from 'vitest';
import { matchExercisesByAlias, normalizeExerciseName } from '@lib/exerciseAliasMatcher';

describe('exerciseAliasMatcher', () => {
  it('normalizes exercise names', () => {
    expect(normalizeExerciseName('  DB-Bench  Press ')).toBe('db bench press');
    expect(normalizeExerciseName("Farmer’s Walk")).toBe('farmers walk');
  });

  it('matches by exact normalized name', () => {
    const { matched, unmatched } = matchExercisesByAlias(
      ['Bench Press'],
      [
        {
          id: 1,
          name: 'bench press',
          category: 'resistance',
          primaryMuscles: ['chest'],
          secondaryMuscles: ['triceps'],
        },
      ],
    );

    expect(unmatched).toEqual([]);
    expect(matched[0]).toMatchObject({
      inputName: 'Bench Press',
      matchedExerciseId: 1,
      matchType: 'exact',
      category: 'resistance',
    });
  });

  it('matches by whole-string alias first', () => {
    const { matched, unmatched } = matchExercisesByAlias(
      ['RDL'],
      [
        {
          id: 2,
          name: 'Romanian Deadlift',
          category: 'resistance',
          primaryMuscles: ['hamstrings'],
          secondaryMuscles: ['glutes'],
        },
      ],
    );

    expect(unmatched).toEqual([]);
    expect(matched[0]).toMatchObject({
      inputName: 'RDL',
      matchedExerciseId: 2,
      matchType: 'whole_alias',
    });
  });

  it('matches by token alias expansion', () => {
    const { matched, unmatched } = matchExercisesByAlias(
      ['DB Row'],
      [
        {
          id: 3,
          name: 'Dumbbell Row',
          category: 'resistance',
          primaryMuscles: ['lats'],
          secondaryMuscles: ['biceps'],
        },
      ],
    );

    expect(unmatched).toEqual([]);
    expect(matched[0]).toMatchObject({
      inputName: 'DB Row',
      matchedExerciseId: 3,
      matchType: 'token_alias',
    });
  });

  it('does not match exercises with null category', () => {
    const { matched, unmatched } = matchExercisesByAlias(
      ['Bench Press'],
      [
        {
          id: 4,
          name: 'Bench Press',
          category: null,
          primaryMuscles: ['chest'],
          secondaryMuscles: ['triceps'],
        },
      ],
    );

    expect(matched).toEqual([]);
    expect(unmatched).toEqual(['Bench Press']);
  });
});
