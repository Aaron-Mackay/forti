import { describe, expect, it } from 'vitest'
import { applyReviewedExercisesToPlan, calculateMuscleVolumes, countUniqueExercises, type ReviewedExercise } from './uploadFlow'
import type { ParsedPlan } from '@/utils/aiPlanParser'
import type { ExerciseMuscleMetadata } from './uploadFlow'

const parsedPlan: ParsedPlan = {
  name: 'Imported Plan',
  description: null,
  order: 1,
  weeks: [
    {
      order: 1,
      workouts: [
        {
          name: 'Lower',
          notes: null,
          order: 1,
          dateCompleted: null,
          exercises: [
            {
              exercise: { name: 'Mystery Squat', category: 'resistance' },
              order: 1,
              repRange: '6-8',
              isBfr: false,
              restTime: '120',
              notes: null,
              targetRpe: null,
              targetRir: null,
              sets: [
                { order: 1, weight: 100, reps: 6, rpe: null, rir: null, isDropSet: false, parentSetId: null },
                { order: 2, weight: 100, reps: 6, rpe: null, rir: null, isDropSet: false, parentSetId: null },
              ],
            },
          ],
        },
      ],
    },
    {
      order: 2,
      workouts: [
        {
          name: 'Pull',
          notes: null,
          order: 1,
          dateCompleted: null,
          exercises: [
            {
              exercise: { name: 'Mystery Squat', category: 'resistance' },
              order: 1,
              repRange: '6-8',
              isBfr: false,
              restTime: '120',
              notes: null,
              targetRpe: null,
              targetRir: null,
              sets: [
                { order: 1, weight: 102.5, reps: 6, rpe: null, rir: null, isDropSet: false, parentSetId: null },
              ],
            },
          ],
        },
      ],
    },
  ],
}

const reviewedExercises: ReviewedExercise[] = [
  {
    originalName: 'Mystery Squat',
    name: 'Low Bar Squat',
    category: 'resistance',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
  },
]

describe('uploadFlow helpers', () => {
  it('applies reviewed exercise names and categories across the parsed plan', () => {
    const reviewedPlan = applyReviewedExercisesToPlan(parsedPlan, reviewedExercises)

    expect(reviewedPlan.weeks[0].workouts[0].exercises[0].exercise.name).toBe('Low Bar Squat')
    expect(reviewedPlan.weeks[1].workouts[0].exercises[0].exercise.category).toBe('resistance')
  })

  it('calculates weighted muscle volume from reviewed exercise metadata', () => {
    const muscleVolumes = calculateMuscleVolumes(parsedPlan, reviewedExercises)

    expect(muscleVolumes.quads).toBe(3)
    expect(muscleVolumes.glutes).toBe(3)
    expect(muscleVolumes.hamstrings).toBe(1.5)
  })

  it('falls back to existing exercise metadata when no new exercises are reviewed', () => {
    const existingExerciseMuscles: Map<string, ExerciseMuscleMetadata> = new Map([
      ['mystery squat', { primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'] }],
    ])

    const muscleVolumes = calculateMuscleVolumes(parsedPlan, [], existingExerciseMuscles)

    expect(muscleVolumes.quads).toBe(3)
    expect(muscleVolumes.glutes).toBe(3)
    expect(muscleVolumes.hamstrings).toBe(1.5)
  })

  it('counts unique exercises after review-friendly renames', () => {
    const reviewedPlan = applyReviewedExercisesToPlan(parsedPlan, reviewedExercises)

    expect(countUniqueExercises(reviewedPlan)).toBe(1)
  })
})
