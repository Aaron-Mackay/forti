import { ExerciseCategory } from '@/generated/prisma/browser'
import type { ExerciseMuscle } from '@/types/dataTypes'
import type { ParsedPlan } from '@/utils/aiPlanParser'

export type ReviewedExercise = {
  originalName: string
  name: string
  category: ExerciseCategory
  primaryMuscles: ExerciseMuscle[]
  secondaryMuscles: ExerciseMuscle[]
  suggestedMatchName?: string
  suggestedMatchType?: 'exact' | 'whole_alias' | 'token_alias'
  suggestedCategory?: ExerciseCategory
  suggestedPrimaryMuscles?: ExerciseMuscle[]
  suggestedSecondaryMuscles?: ExerciseMuscle[]
}

export type PendingUploadPlan = {
  plan: ParsedPlan
  reviewedExercises: ReviewedExercise[]
}

export type ExerciseMuscleMetadata = {
  primaryMuscles: ExerciseMuscle[]
  secondaryMuscles: ExerciseMuscle[]
}

function normalizeExerciseKey(name: string): string {
  return name.trim().toLowerCase()
}

export function applyReviewedExercisesToPlan(plan: ParsedPlan, reviewedExercises: ReviewedExercise[]): ParsedPlan {
  const reviewMap = new Map(reviewedExercises.map((exercise) => [exercise.originalName, exercise]))

  return {
    ...plan,
    weeks: plan.weeks.map((week) => ({
      ...week,
      workouts: week.workouts.map((workout) => ({
        ...workout,
        exercises: workout.exercises.map((exercise) => {
          const reviewedExercise = reviewMap.get(exercise.exercise.name)
          if (!reviewedExercise) return exercise

          return {
            ...exercise,
            exercise: {
              ...exercise.exercise,
              name: reviewedExercise.name,
              category: reviewedExercise.category,
            },
          }
        }),
      })),
    })),
  }
}

export function calculateMuscleVolumes(
  plan: ParsedPlan,
  reviewedExercises: ReviewedExercise[],
  existingExerciseMuscles: Map<string, ExerciseMuscleMetadata> = new Map(),
): Record<ExerciseMuscle, number> {
  const reviewedByOriginalName = new Map(reviewedExercises.map((exercise) => [exercise.originalName, exercise]))
  const reviewedByCurrentName = new Map(reviewedExercises.map((exercise) => [exercise.name, exercise]))
  const volumes = new Map<ExerciseMuscle, number>()

  for (const week of plan.weeks) {
    for (const workout of week.workouts) {
      for (const exercise of workout.exercises) {
        const reviewedExercise = reviewedByOriginalName.get(exercise.exercise.name) ?? reviewedByCurrentName.get(exercise.exercise.name)
        const existingExercise = existingExerciseMuscles.get(normalizeExerciseKey(exercise.exercise.name))
        const primaryMuscles = reviewedExercise?.primaryMuscles ?? existingExercise?.primaryMuscles ?? []
        const secondaryMuscles = reviewedExercise?.secondaryMuscles ?? existingExercise?.secondaryMuscles ?? []
        if (primaryMuscles.length === 0 && secondaryMuscles.length === 0) continue

        const workingSetCount = Math.max(
          1,
          exercise.sets.filter((set) => !set.isDropSet).length || exercise.sets.length,
        )

        for (const muscle of primaryMuscles) {
          volumes.set(muscle, (volumes.get(muscle) ?? 0) + workingSetCount)
        }
        for (const muscle of secondaryMuscles) {
          volumes.set(muscle, (volumes.get(muscle) ?? 0) + workingSetCount * 0.5)
        }
      }
    }
  }

  return Object.fromEntries(volumes) as Record<ExerciseMuscle, number>
}

export function countUniqueExercises(plan: ParsedPlan): number {
  return new Set(
    plan.weeks.flatMap((week) =>
      week.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exercise.name.toLowerCase())),
    ),
  ).size
}
