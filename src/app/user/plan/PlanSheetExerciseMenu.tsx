'use client'

import React from 'react'
import { Divider, Menu } from '@mui/material'
import { Dir } from '@lib/useWorkoutEditor'
import { WorkoutExercisePrisma } from '@/types/dataTypes'
import { addTrailingDropSet, removeExercises, removeTrailingDropSets, setBfrEnabled } from './exerciseMenuActions'
import { confirmRemoveLastSetWithDrops } from './exerciseSetModel'
import { ExerciseMenuActionItem, ExerciseMenuDropAndBfrItems, ExerciseMenuMoveItems } from './ExerciseMenuItems'
import { MenuState, WorkoutEditorDispatch } from './PlanSheetShared'

type PlanSheetExerciseMenuProps = {
  dispatch: WorkoutEditorDispatch
  menuState: MenuState | null
  menuEx: WorkoutExercisePrisma | null
  menuTopLevelSets: WorkoutExercisePrisma['sets']
  menuDropSets: WorkoutExercisePrisma['sets']
  onClose: () => void
  planId: number
}

export function PlanSheetExerciseMenu({
  dispatch,
  menuState,
  menuEx,
  menuTopLevelSets,
  menuDropSets,
  onClose,
  planId,
}: PlanSheetExerciseMenuProps) {
  const menuTarget = menuState && menuEx
    ? [{ weekId: menuState.weekId, workoutId: menuState.workoutId, exercise: menuEx }]
    : []

  return (
    <Menu
      anchorEl={menuState?.anchor ?? null}
      open={Boolean(menuState)}
      onClose={onClose}
      slotProps={{ paper: { sx: { minWidth: '10rem' } } }}
    >
      {menuState && !menuState.isCardio && [
        <ExerciseMenuDropAndBfrItems
          key="toggle-drop-bfr"
          dense
          isCardio={menuState.isCardio}
          dropSetsEnabled={menuDropSets.length > 0}
          isBfr={Boolean(menuEx?.isBfr)}
          onToggleDropSets={(checked) => {
            if (!checked) {
              removeTrailingDropSets({ dispatch, planId, targets: menuTarget })
              return
            }
            if (menuTarget[0]) {
              addTrailingDropSet({ dispatch, planId, target: menuTarget[0] })
            }
          }}
          onToggleBfr={(checked) => {
            setBfrEnabled({ dispatch, planId, targets: menuTarget, enabled: checked })
          }}
        />,
        <Divider key="div0" />,
        <ExerciseMenuActionItem
          key="add-set"
          dense
          onClick={() => {
            dispatch({ type: 'ADD_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId })
            onClose()
          }}
        >
          Add set
        </ExerciseMenuActionItem>,
        <ExerciseMenuActionItem
          key="remove-set"
          dense
          disabled={menuTopLevelSets.length === 0}
          onClick={() => {
            if (menuEx && !confirmRemoveLastSetWithDrops(menuEx)) return
            dispatch({ type: 'REMOVE_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId })
            onClose()
          }}
        >
          Remove set
        </ExerciseMenuActionItem>,
        <Divider key="div1" />,
        <ExerciseMenuActionItem
          key="add-drop"
          dense
          disabled={menuTopLevelSets.length === 0 || menuDropSets.length === 0}
          onClick={() => {
            const parentSetId = menuTopLevelSets[menuTopLevelSets.length - 1]?.id
            if (parentSetId != null) {
              dispatch({ type: 'ADD_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, parentSetId })
            }
            onClose()
          }}
        >
          Add drop set
        </ExerciseMenuActionItem>,
        <ExerciseMenuActionItem
          key="remove-drop"
          dense
          disabled={menuDropSets.length === 0}
          onClick={() => {
            const lastDrop = menuDropSets[menuDropSets.length - 1]
            if (lastDrop) {
              dispatch({ type: 'REMOVE_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, setId: lastDrop.id })
            }
            onClose()
          }}
        >
          Remove drop set
        </ExerciseMenuActionItem>,
        <Divider key="div2" />,
        <ExerciseMenuMoveItems
          key="move-items"
          dense
          canMoveUp={menuState.exerciseIndex > 0}
          canMoveDown={menuState.exerciseIndex < menuState.exerciseCount - 1}
          onMoveUp={() => {
            dispatch({ type: 'MOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, dir: Dir.UP, index: menuState.exerciseIndex })
            onClose()
          }}
          onMoveDown={() => {
            dispatch({ type: 'MOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, dir: Dir.DOWN, index: menuState.exerciseIndex })
            onClose()
          }}
        />,
        <Divider key="div3" />,
      ]}
      <ExerciseMenuActionItem
        dense
        color="error.main"
        onClick={() => {
          removeExercises({ dispatch, planId, targets: menuTarget })
          onClose()
        }}
      >
        Delete exercise
      </ExerciseMenuActionItem>
    </Menu>
  )
}
