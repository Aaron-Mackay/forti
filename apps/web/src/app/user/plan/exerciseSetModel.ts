'use client'

import type { WorkoutExercisePrisma } from '@/types/dataTypes'

export function getExerciseSetModel(exercise: WorkoutExercisePrisma) {
  const topLevelSets = exercise.sets.filter((set) => !set.isDropSet).sort((a, b) => a.order - b.order)
  const dropSets = exercise.sets.filter((set) => set.isDropSet).sort((a, b) => a.order - b.order)
  const lastTopLevelSet = topLevelSets[topLevelSets.length - 1] ?? null
  const trailingDropSets = lastTopLevelSet
    ? dropSets.filter((set) => set.parentSetId === lastTopLevelSet.id)
    : []

  const dropsByParent = new Map<number, typeof dropSets>()
  for (const dropSet of dropSets) {
    if (dropSet.parentSetId == null) continue
    if (!dropsByParent.has(dropSet.parentSetId)) dropsByParent.set(dropSet.parentSetId, [])
    dropsByParent.get(dropSet.parentSetId)!.push(dropSet)
  }

  return {
    topLevelSets,
    dropSets,
    lastTopLevelSet,
    trailingDropSets,
    dropsByParent,
  }
}

export function confirmRemoveLastSetWithDrops(exercise: WorkoutExercisePrisma) {
  const { trailingDropSets } = getExerciseSetModel(exercise)
  if (trailingDropSets.length === 0) return true

  return window.confirm(
    `Remove the last set and its ${trailingDropSets.length} attached drop ${trailingDropSets.length === 1 ? 'set' : 'sets'}?`,
  )
}
