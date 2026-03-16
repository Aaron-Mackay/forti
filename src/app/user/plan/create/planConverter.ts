import { PLACEHOLDER_ID } from './PlanBuilderWithContext'
import type { ParsedPlan } from '@/utils/aiPlanParser'
import type {
  PlanPrisma,
  WeekPrisma,
  WorkoutPrisma,
  WorkoutExercisePrisma,
  SetPrisma,
} from '@/types/dataTypes'

/**
 * Convert a ParsedPlan (from AI response or template) to a PlanPrisma
 * with placeholder negative IDs, ready to dispatch as REPLACE_PLAN.
 */
export function parsedPlanToPlanPrisma(parsed: ParsedPlan, currentPlan: PlanPrisma): PlanPrisma {
  let idCounter = 0
  const nextId = () => -(++idCounter)

  return {
    id: PLACEHOLDER_ID,
    userId: currentPlan.userId,
    name: parsed.name,
    description: parsed.description ?? null,
    order: currentPlan.order,
    weeks: parsed.weeks.map((week): WeekPrisma => {
      const weekId = nextId()
      return {
        id: weekId,
        planId: PLACEHOLDER_ID,
        order: week.order,
        workouts: week.workouts.map((workout): WorkoutPrisma => {
          const workoutId = nextId()
          return {
            id: workoutId,
            weekId,
            name: workout.name,
            notes: workout.notes ?? null,
            order: workout.order,
            dateCompleted: null,
            exercises: workout.exercises.map((ex): WorkoutExercisePrisma => {
              const exerciseId = nextId()
              return {
                id: exerciseId,
                workoutId,
                exerciseId: PLACEHOLDER_ID,
                order: ex.order,
                repRange: ex.repRange ?? null,
                restTime: ex.restTime ?? null,
                notes: ex.notes ?? null,
                exercise: {
                  id: PLACEHOLDER_ID,
                  name: ex.exercise.name,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  category: ex.exercise.category as any,
                  description: null,
                  equipment: [],
                  primaryMuscles: [],
                  secondaryMuscles: [],
                },
                sets: ex.sets.map((set): SetPrisma => ({
                  id: nextId(),
                  workoutExerciseId: exerciseId,
                  order: set.order,
                  weight: set.weight ?? null,
                  reps: set.reps ?? null,
                  e1rm: null,
                  isDropSet: false,
                  parentSetId: null,
                })),
                cardioDuration: null,
                cardioDistance: null,
                cardioResistance: null,
                substitutedForId: null,
                substitutedFor: null,
                isAdded: false,
              }
            }),
          }
        }),
      }
    }),
  }
}
