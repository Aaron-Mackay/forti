export type PreviousWorkoutCandidate<T> = {
  sortValue: number
  value: T
  workoutId?: number
  workoutOrder?: number | null
  exerciseId?: number | null
  hasTrackedData?: boolean
}

export type PreviousWorkoutSelectionOptions = {
  currentSortValue: number
  currentWorkoutId?: number
  targetWorkoutOrder?: number
  targetExerciseId?: number
  excludeCurrentWorkout?: boolean
  requireTrackedData?: boolean
  limit?: number
}

export function selectPreviousWorkoutCandidates<T>(
  candidates: PreviousWorkoutCandidate<T>[],
  options: PreviousWorkoutSelectionOptions,
): T[] {
  const {
    currentSortValue,
    currentWorkoutId,
    targetWorkoutOrder,
    targetExerciseId,
    excludeCurrentWorkout = true,
    requireTrackedData = false,
    limit,
  } = options

  const filtered = candidates.filter((candidate) => {
    if (candidate.sortValue >= currentSortValue) return false
    if (excludeCurrentWorkout && currentWorkoutId !== undefined && candidate.workoutId === currentWorkoutId) return false
    if (targetWorkoutOrder !== undefined && candidate.workoutOrder !== targetWorkoutOrder) return false
    if (targetExerciseId !== undefined && candidate.exerciseId !== targetExerciseId) return false
    if (requireTrackedData && !candidate.hasTrackedData) return false
    return true
  })

  const sorted = filtered.sort((a, b) => {
    if (a.sortValue !== b.sortValue) return b.sortValue - a.sortValue
    return (b.workoutId ?? -1) - (a.workoutId ?? -1)
  })

  const selected = sorted.map((candidate) => candidate.value)
  return limit === undefined ? selected : selected.slice(0, limit)
}

export function selectPreviousWorkoutCandidate<T>(
  candidates: PreviousWorkoutCandidate<T>[],
  options: PreviousWorkoutSelectionOptions,
): T | null {
  return selectPreviousWorkoutCandidates(candidates, { ...options, limit: 1 })[0] ?? null
}
