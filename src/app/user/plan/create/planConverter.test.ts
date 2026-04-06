import { describe, expect, it } from 'vitest'
import { parsedPlanToPlanPrisma } from './planConverter'
import { BFR_REP_RANGE, BFR_REST_TIME, BFR_SET_COUNT } from '@/utils/userPlanMutators'
import type { ParsedPlan } from '@/utils/aiPlanParser'
import type { PlanPrisma } from '@/types/dataTypes'

describe('parsedPlanToPlanPrisma', () => {
  it('applies the Forti BFR preset when an imported exercise is marked as BFR', () => {
    const parsedPlan: ParsedPlan = {
      name: 'Plan',
      description: null,
      order: 1,
      weeks: [
        {
          order: 1,
          workouts: [
            {
              name: 'Day 1',
              notes: null,
              order: 1,
              dateCompleted: null,
              exercises: [
                {
                  exercise: { name: 'Leg Extension', category: 'resistance' },
                  order: 1,
                  repRange: null,
                  isBfr: true,
                  restTime: '90',
                  notes: null,
                  targetRpe: null,
                  targetRir: null,
                  sets: [
                    { order: 1, weight: 20, reps: 30, rpe: 8, rir: null },
                    { order: 2, weight: 20, reps: 15, rpe: null, rir: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const currentPlan = {
      userId: 'user-1',
      order: 3,
    } as PlanPrisma

    const converted = parsedPlanToPlanPrisma(parsedPlan, currentPlan)
    const exercise = converted.weeks[0].workouts[0].exercises[0]

    expect(exercise.isBfr).toBe(true)
    expect(exercise.repRange).toBe(BFR_REP_RANGE)
    expect(exercise.restTime).toBe(BFR_REST_TIME)
    expect(exercise.sets).toHaveLength(BFR_SET_COUNT)
    expect(exercise.sets.map((set) => set.order)).toEqual([1, 2, 3, 4])
    expect(exercise.sets[0]).toMatchObject({ weight: 20, reps: 30, rpe: 8 })
    expect(exercise.sets[1]).toMatchObject({ weight: 20, reps: 15, rir: 1 })
    expect(exercise.sets[2]).toMatchObject({ weight: null, reps: null, rpe: null, rir: null })
    expect(exercise.sets[3]).toMatchObject({ weight: null, reps: null, rpe: null, rir: null })
  })
})
