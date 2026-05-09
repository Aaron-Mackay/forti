import { describe, expect, it } from 'vitest';
import { buildWorkoutSummaries } from './workoutSummaries';

describe('buildWorkoutSummaries', () => {
  it('counts completed and planned sets across exercises', () => {
    const summaries = buildWorkoutSummaries([
      {
        id: 1,
        name: 'Push',
        exercises: [
          {
            sets: [
              { id: 1, reps: 10, isDropSet: false, parentSetId: null, order: 1 },
              { id: 2, reps: null, isDropSet: false, parentSetId: null, order: 2 },
            ],
            exercise: { category: 'resistance', primaryMuscles: ['sternal-pec'] },
          },
          {
            sets: [
              { id: 3, reps: 12, isDropSet: false, parentSetId: null, order: 1 },
            ],
            exercise: { category: 'cardio', primaryMuscles: ['quads'] },
          },
        ],
      },
    ]);

    expect(summaries).toEqual([
      {
        workoutId: 1,
        workoutName: 'Push',
        completedSets: 2,
        plannedSets: 3,
        muscleDoneSets: [{ muscle: 'sternal-pec', doneSets: 1 }],
      },
    ]);
  });

  it('counts completed drop sets as half a muscle-set contribution', () => {
    const summaries = buildWorkoutSummaries([
      {
        id: 2,
        name: 'Pull',
        exercises: [
          {
            sets: [
              { id: 10, reps: 8, isDropSet: false, parentSetId: null, order: 1 },
              { id: 11, reps: 6, isDropSet: true, parentSetId: 10, order: 2 },
              { id: 12, reps: 0, isDropSet: true, parentSetId: 10, order: 3 },
            ],
            exercise: { category: 'resistance', primaryMuscles: ['lats', 'biceps'] },
          },
        ],
      },
    ]);

    expect(summaries[0]).toEqual(expect.objectContaining({
      completedSets: 2,
      plannedSets: 3,
      muscleDoneSets: [
        { muscle: 'lats', doneSets: 1.5 },
        { muscle: 'biceps', doneSets: 1.5 },
      ],
    }));
  });
});
