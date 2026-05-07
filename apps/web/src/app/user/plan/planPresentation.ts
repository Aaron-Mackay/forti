'use client'

import { PlanPrisma, WorkoutExercisePrisma } from '@/types/dataTypes'
import { selectPreviousWorkoutCandidate } from '@lib/previousWorkoutSelector'

export function stripWorkoutSuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

export function hasTrackedSetData(plan: PlanPrisma, weekId: number): boolean {
  const week = plan.weeks.find((entry) => entry.id === weekId)
  if (!week) return false

  return week.workouts.some((workout) =>
    workout.exercises.some((exercise) =>
      exercise.sets.some((set) => set.weight != null || (set.reps != null && set.reps > 0)),
    ),
  )
}

export function hasTrackedExerciseSetData(exercise: WorkoutExercisePrisma | null | undefined): boolean {
  if (!exercise) return false

  return exercise.sets.some((set) => set.weight != null || (set.reps != null && set.reps > 0))
}

export function getLatestTrackedWeekIndex(plan: PlanPrisma): number {
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order)
  let lastTrackedWeekIndex = -1

  sortedWeeks.forEach((week, index) => {
    if (hasTrackedSetData(plan, week.id)) {
      lastTrackedWeekIndex = index
    }
  })

  return lastTrackedWeekIndex >= 0 ? lastTrackedWeekIndex : Math.max(0, sortedWeeks.length - 1)
}

export function getLatestTrackedWeekId(plan: PlanPrisma): number | null {
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order)
  let lastTrackedWeekId: number | null = null

  sortedWeeks.forEach((week) => {
    if (hasTrackedSetData(plan, week.id)) {
      lastTrackedWeekId = week.id
    }
  })

  return lastTrackedWeekId ?? sortedWeeks[sortedWeeks.length - 1]?.id ?? null
}

export function getPreviousTrackedExercise(
  plan: PlanPrisma,
  currentWeekOrder: number,
  workoutOrder: number,
  exerciseId: number,
): WorkoutExercisePrisma | null {
  const candidates = plan.weeks.flatMap((week) =>
    week.workouts.flatMap((workout) =>
      workout.exercises.map((exercise) => ({
        sortValue: week.order,
        workoutId: workout.id,
        workoutOrder: workout.order,
        exerciseId: exercise.exercise?.id ?? null,
        hasTrackedData: hasTrackedExerciseSetData(exercise),
        value: exercise,
      })),
    ),
  )

  return selectPreviousWorkoutCandidate(candidates, {
    currentSortValue: currentWeekOrder,
    targetWorkoutOrder: workoutOrder,
    targetExerciseId: exerciseId,
    requireTrackedData: true,
    excludeCurrentWorkout: false,
  })
}

export function getE1rmDeltaDirection(
  currentE1rm: number | null,
  previousE1rm: number | null,
): 'up' | 'down' | 'flat' | 'none' {
  if (currentE1rm == null || previousE1rm == null) return 'none'
  if (currentE1rm > previousE1rm) return 'up'
  if (currentE1rm < previousE1rm) return 'down'
  return 'flat'
}
