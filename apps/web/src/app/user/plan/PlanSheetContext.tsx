'use client'

import React, { createContext, useContext } from 'react'
import { MenuState, WorkoutEditorDispatch } from './PlanSheetShared'

interface PlanSheetContextValue {
  planId: number
  dispatch: WorkoutEditorDispatch
  runWithCheckpoint: (fn: () => void) => void
  beginBufferedEdit?: () => void
  commitBufferedEdit?: () => void
  cancelBufferedEdit?: () => void
  arrangeMode: boolean
  creationMode: boolean
  openPicker: (weekId: number, workoutId: number) => void
  openRenamePicker: (weekId: number, workoutId: number, workoutExerciseId: number) => void
  setMenuState: (state: MenuState | null) => void
  invalidRepRangeIds?: Set<number>
  onRepRangeFocus?: (exerciseId: number) => void
  onRepRangeBlur?: (exerciseId: number) => void
}

const PlanSheetContext = createContext<PlanSheetContextValue | null>(null)

export function PlanSheetProvider({
  value,
  children,
}: {
  value: PlanSheetContextValue
  children: React.ReactNode
}) {
  return <PlanSheetContext.Provider value={value}>{children}</PlanSheetContext.Provider>
}

export function usePlanSheetContext() {
  const context = useContext(PlanSheetContext)
  if (!context) throw new Error('usePlanSheetContext must be used within PlanSheetProvider')
  return context
}
