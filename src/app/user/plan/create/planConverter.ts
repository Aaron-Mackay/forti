import { PLACEHOLDER_ID } from './PlanBuilderWithContext'
import type { ReviewedExercise } from '@/app/user/plan/upload/uploadFlow'
import type { ParsedPlan } from '@/utils/aiPlanParser'
import { BFR_REP_RANGE, BFR_REST_TIME, BFR_SET_COUNT } from '@/utils/userPlanMutators'
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
export function parsedPlanToPlanPrisma(
  parsed: ParsedPlan,
  currentPlan: PlanPrisma,
  reviewedExercises: ReviewedExercise[] = [],
): PlanPrisma {
  let idCounter = 0
  const nextId = () => -(++idCounter)
  const reviewedExerciseMap = new Map(reviewedExercises.map((exercise) => [exercise.name, exercise]))

  return {
    id: PLACEHOLDER_ID,
    userId: currentPlan.userId,
    name: parsed.name,
    description: parsed.description ?? null,
    order: currentPlan.order,
    lastActivityDate: currentPlan.lastActivityDate ?? null,
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
              const reviewedExercise = reviewedExerciseMap.get(ex.exercise.name)
              const isBfr = ex.isBfr ?? false
              const sourceSets = isBfr
                ? Array.from({ length: BFR_SET_COUNT }, (_, i) => ex.sets[i] ?? null)
                : ex.sets
              const sourceOrderToNewId = new Map<number, number>()
              sourceSets.forEach((set) => {
                if (set) sourceOrderToNewId.set(set.order, nextId())
              })
              return {
                id: exerciseId,
                workoutId,
                exerciseId: PLACEHOLDER_ID,
                order: ex.order,
                repRange: isBfr ? BFR_REP_RANGE : ex.repRange ?? null,
                restTime: isBfr ? BFR_REST_TIME : ex.restTime ?? null,
                notes: ex.notes ?? null,
                targetRpe: ex.targetRpe ?? null,
                targetRir: ex.targetRir ?? null,
                exercise: {
                  id: PLACEHOLDER_ID,
                  name: ex.exercise.name,
                  category: (reviewedExercise?.category ?? ex.exercise.category) as WorkoutExercisePrisma['exercise']['category'],
                  description: null,
                  equipment: [],
                  primaryMuscles: reviewedExercise?.primaryMuscles ?? [],
                  secondaryMuscles: reviewedExercise?.secondaryMuscles ?? [],
                  createdByUserId: null,
                },
                sets: sourceSets.map((set, index): SetPrisma => ({
                  id: set ? (sourceOrderToNewId.get(set.order) ?? nextId()) : nextId(),
                  workoutExerciseId: exerciseId,
                  order: index + 1,
                  weight: set?.weight ?? null,
                  reps: set?.reps ?? null,
                  e1rm: null,
                  rpe: set?.rpe ?? null,
                  rir: set?.rir ?? null,
                  isDropSet: isBfr ? false : (set?.isDropSet ?? false),
                  parentSetId: isBfr ? null : (set?.parentSetId != null ? (sourceOrderToNewId.get(set.parentSetId) ?? null) : null),
                })),
                cardioDuration: null,
                cardioDistance: null,
                cardioResistance: null,
                substitutedForId: null,
                substitutedFor: null,
                isAdded: false,
                isBfr,
              }
            }),
          }
        }),
      }
    }),
  }
}
