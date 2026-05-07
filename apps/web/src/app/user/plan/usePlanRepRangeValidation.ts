'use client'

import { useMemo, useState } from 'react'
import { PlanPrisma } from '@/types/dataTypes'
import { isValidPlanRepRangeInput } from '@lib/repRange'

type UsePlanRepRangeValidationOptions = {
  errorMessage?: string
  hideFocused?: boolean
}

export function usePlanRepRangeValidation(
  plan: Pick<PlanPrisma, 'weeks'>,
  { errorMessage = 'Use 10, 5-10, 5+, AMRAP, or leave blank.', hideFocused = false }: UsePlanRepRangeValidationOptions = {},
) {
  const [repRangeTouchedIds, setRepRangeTouchedIds] = useState<Set<number>>(new Set())
  const [focusedRepRangeId, setFocusedRepRangeId] = useState<number | null>(null)
  const [saveAttempted, setSaveAttempted] = useState(false)

  const invalidRepRangeIds = useMemo(() => {
    const ids = new Set<number>()
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        for (const exercise of workout.exercises) {
          if (!isValidPlanRepRangeInput(exercise.repRange)) {
            ids.add(exercise.id)
          }
        }
      }
    }
    return ids
  }, [plan.weeks])

  const repRangeErrors = useMemo(() => {
    const errors = new Map<number, string>()
    for (const id of invalidRepRangeIds) {
      errors.set(id, errorMessage)
    }
    return errors
  }, [errorMessage, invalidRepRangeIds])

  const visibleInvalidRepRangeIds = useMemo(() => {
    if (saveAttempted) return invalidRepRangeIds
    const ids = new Set<number>()
    for (const id of invalidRepRangeIds) {
      if (!repRangeTouchedIds.has(id)) continue
      if (hideFocused && id === focusedRepRangeId) continue
      ids.add(id)
    }
    return ids
  }, [focusedRepRangeId, hideFocused, invalidRepRangeIds, repRangeTouchedIds, saveAttempted])

  const visibleRepRangeErrors = useMemo(() => {
    if (saveAttempted) return repRangeErrors
    const visible = new Map<number, string>()
    for (const [id, message] of repRangeErrors) {
      if (!repRangeTouchedIds.has(id)) continue
      if (hideFocused && id === focusedRepRangeId) continue
      visible.set(id, message)
    }
    return visible
  }, [focusedRepRangeId, hideFocused, repRangeErrors, repRangeTouchedIds, saveAttempted])

  const markRepRangeTouched = (exerciseId: number) => {
    setRepRangeTouchedIds((prev) => {
      if (prev.has(exerciseId)) return prev
      const next = new Set(prev)
      next.add(exerciseId)
      return next
    })
  }

  const handleRepRangeFocus = (exerciseId: number) => {
    setFocusedRepRangeId(exerciseId)
  }

  const handleRepRangeBlur = (exerciseId: number) => {
    setFocusedRepRangeId((prev) => (prev === exerciseId ? null : prev))
    markRepRangeTouched(exerciseId)
  }

  return {
    handleRepRangeBlur,
    handleRepRangeFocus,
    invalidRepRangeIds,
    markRepRangeTouched,
    repRangeErrors,
    saveAttempted,
    setSaveAttempted,
    visibleInvalidRepRangeIds,
    visibleRepRangeErrors,
  }
}
