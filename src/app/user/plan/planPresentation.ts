'use client'

import { PlanPrisma, WorkoutExercisePrisma } from '@/types/dataTypes'

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
  const sortedWeeks = [...plan.weeks].sort((a, b) => b.order - a.order)

  for (const week of sortedWeeks) {
    if (week.order >= currentWeekOrder) continue

    const workout = week.workouts.find((entry) => entry.order === workoutOrder)
    const exercise = workout?.exercises.find((entry) => entry.exercise?.id === exerciseId) ?? null

    if (hasTrackedExerciseSetData(exercise)) {
      return exercise
    }
  }

  return null
}
