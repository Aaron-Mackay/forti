import { describe, expect, it } from 'vitest'
import { getE1rmDeltaDirection, getPreviousTrackedExercise } from './planPresentation'
import type { PlanPrisma } from '@/types/dataTypes'

function makePlan(): PlanPrisma {
  return {
    id: 1,
    name: 'Plan',
    weeks: [
      {
        id: 11,
        order: 1,
        workouts: [
          {
            id: 21,
            order: 1,
            name: 'A',
            exercises: [
              {
                id: 31,
                order: 1,
                exerciseId: 100,
                exercise: { id: 100, name: 'Bench', category: 'resistance' } as never,
                sets: [{ id: 41, order: 1, isDropSet: false, reps: 8, weight: 100 }] as never,
              },
            ],
          },
        ],
      },
      {
        id: 12,
        order: 2,
        workouts: [
          {
            id: 22,
            order: 1,
            name: 'A',
            exercises: [
              {
                id: 32,
                order: 1,
                exerciseId: 100,
                exercise: { id: 100, name: 'Bench', category: 'resistance' } as never,
                sets: [{ id: 42, order: 1, isDropSet: false, reps: null, weight: null }] as never,
              },
            ],
          },
        ],
      },
      {
        id: 13,
        order: 3,
        workouts: [
          {
            id: 23,
            order: 1,
            name: 'A',
            exercises: [
              {
                id: 33,
                order: 1,
                exerciseId: 100,
                exercise: { id: 100, name: 'Bench', category: 'resistance' } as never,
                sets: [] as never,
              },
            ],
          },
        ],
      },
    ],
  } as never
}

describe('getPreviousTrackedExercise', () => {
  it('returns nearest tracked exercise from previous weeks in same slot and exercise', () => {
    const result = getPreviousTrackedExercise(makePlan(), 3, 1, 100)
    expect(result?.id).toBe(31)
  })

  it('returns null when there is no prior tracked counterpart', () => {
    const result = getPreviousTrackedExercise(makePlan(), 1, 1, 100)
    expect(result).toBeNull()
  })
})

describe('getE1rmDeltaDirection', () => {
  it('handles up/down/flat/none cases', () => {
    expect(getE1rmDeltaDirection(101, 100)).toBe('up')
    expect(getE1rmDeltaDirection(99, 100)).toBe('down')
    expect(getE1rmDeltaDirection(100, 100)).toBe('flat')
    expect(getE1rmDeltaDirection(null, 100)).toBe('none')
  })
})
