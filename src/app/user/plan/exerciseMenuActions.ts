'use client'

import type { WorkoutExercisePrisma } from '@/types/dataTypes'
import { getExerciseSetModel } from './exerciseSetModel'
import type { WorkoutEditorDispatch } from './PlanSheetShared'

export type ExerciseActionTarget = {
  weekId: number
  workoutId: number
  exercise: WorkoutExercisePrisma
}

export function getTopLevelSets(exercise: WorkoutExercisePrisma) {
  return getExerciseSetModel(exercise).topLevelSets
}

export function getDropSets(exercise: WorkoutExercisePrisma) {
  return getExerciseSetModel(exercise).dropSets
}

export function getTrailingDropSets(exercise: WorkoutExercisePrisma) {
  return getExerciseSetModel(exercise).trailingDropSets
}

export function hasTrailingDropSets(exercise: WorkoutExercisePrisma) {
  return getTrailingDropSets(exercise).length > 0
}

export function addTrailingDropSet({
  dispatch,
  planId,
  target,
}: {
  dispatch: WorkoutEditorDispatch
  planId: number
  target: ExerciseActionTarget
}) {
  const lastTopLevelSet = getExerciseSetModel(target.exercise).lastTopLevelSet
  if (!lastTopLevelSet) return

  dispatch({
    type: 'ADD_DROP_SET',
    planId,
    weekId: target.weekId,
    workoutId: target.workoutId,
    exerciseId: target.exercise.id,
    parentSetId: lastTopLevelSet.id,
  })
}

export function removeTrailingDropSets({
  dispatch,
  planId,
  targets,
}: {
  dispatch: WorkoutEditorDispatch
  planId: number
  targets: ExerciseActionTarget[]
}) {
  targets.forEach((target) => {
    getTrailingDropSets(target.exercise).forEach((set) => {
      dispatch({
        type: 'REMOVE_DROP_SET',
        planId,
        weekId: target.weekId,
        workoutId: target.workoutId,
        exerciseId: target.exercise.id,
        setId: set.id,
      })
    })
  })
}

export function setBfrEnabled({
  dispatch,
  planId,
  targets,
  enabled,
}: {
  dispatch: WorkoutEditorDispatch
  planId: number
  targets: ExerciseActionTarget[]
  enabled: boolean
}) {
  targets.forEach((target) => {
    dispatch({
      type: 'TOGGLE_BFR',
      planId,
      weekId: target.weekId,
      workoutId: target.workoutId,
      workoutExerciseId: target.exercise.id,
      enabled,
    })
  })
}

export function removeExercises({
  dispatch,
  planId,
  targets,
}: {
  dispatch: WorkoutEditorDispatch
  planId: number
  targets: ExerciseActionTarget[]
}) {
  targets.forEach((target) => {
    dispatch({
      type: 'REMOVE_EXERCISE',
      planId,
      weekId: target.weekId,
      workoutId: target.workoutId,
      exerciseId: target.exercise.id,
    })
  })
}
