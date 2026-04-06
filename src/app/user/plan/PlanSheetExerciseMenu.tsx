'use client'

import React from 'react'
import { Divider, Menu, MenuItem, Switch, Typography } from '@mui/material'
import { Dir } from '@lib/useWorkoutEditor'
import { WorkoutExercisePrisma } from '@/types/dataTypes'
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
  return (
    <Menu
      anchorEl={menuState?.anchor ?? null}
      open={Boolean(menuState)}
      onClose={onClose}
      slotProps={{ paper: { sx: { minWidth: '10rem' } } }}
    >
      {menuState && !menuState.isCardio && [
        <MenuItem
          key="toggle-drops"
          dense
          onClick={() => {
            const lastTopLevelSet = menuTopLevelSets[menuTopLevelSets.length - 1]
            if (menuDropSets.length > 0) {
              menuDropSets.forEach((set) => {
                dispatch({ type: 'REMOVE_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, setId: set.id })
              })
              return
            }
            if (lastTopLevelSet) {
              dispatch({ type: 'ADD_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, parentSetId: lastTopLevelSet.id })
            }
          }}
          sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography variant="inherit">Enable drop sets</Typography>
          <Switch
            size="small"
            edge="end"
            checked={menuDropSets.length > 0}
            tabIndex={-1}
            disableRipple
            onClick={(event) => event.stopPropagation()}
            onChange={(_, checked) => {
              const lastTopLevelSet = menuTopLevelSets[menuTopLevelSets.length - 1]
              if (!checked) {
                menuDropSets.forEach((set) => {
                  dispatch({ type: 'REMOVE_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, setId: set.id })
                })
                return
              }
              if (lastTopLevelSet && menuDropSets.length === 0) {
                dispatch({ type: 'ADD_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, parentSetId: lastTopLevelSet.id })
              }
            }}
            inputProps={{ 'aria-label': 'Toggle drop sets' }}
          />
        </MenuItem>,
        <Divider key="div0" />,
        <MenuItem
          key="add-set"
          dense
          onClick={() => {
            dispatch({ type: 'ADD_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId })
            onClose()
          }}
        >
          Add set
        </MenuItem>,
        <MenuItem
          key="remove-set"
          dense
          disabled={menuTopLevelSets.length === 0}
          onClick={() => {
            const lastTopLevelSet = menuTopLevelSets[menuTopLevelSets.length - 1]
            const attachedDropCount = lastTopLevelSet
              ? menuDropSets.filter((set) => set.parentSetId === lastTopLevelSet.id).length
              : 0
            if (attachedDropCount > 0) {
              const confirmed = window.confirm(`Remove the last set and its ${attachedDropCount} attached drop ${attachedDropCount === 1 ? 'set' : 'sets'}?`)
              if (!confirmed) return
            }
            dispatch({ type: 'REMOVE_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId })
            onClose()
          }}
        >
          Remove set
        </MenuItem>,
        <Divider key="div1" />,
        <MenuItem
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
        </MenuItem>,
        <MenuItem
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
        </MenuItem>,
        <Divider key="div2" />,
        <MenuItem
          key="move-up"
          dense
          disabled={menuState.exerciseIndex === 0}
          onClick={() => {
            dispatch({ type: 'MOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, dir: Dir.UP, index: menuState.exerciseIndex })
            onClose()
          }}
        >
          Move up
        </MenuItem>,
        <MenuItem
          key="move-down"
          dense
          disabled={menuState.exerciseIndex === menuState.exerciseCount - 1}
          onClick={() => {
            dispatch({ type: 'MOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, dir: Dir.DOWN, index: menuState.exerciseIndex })
            onClose()
          }}
        >
          Move down
        </MenuItem>,
        <MenuItem
          key="toggle-bfr"
          dense
          onClick={() => {
            if (menuEx) {
              dispatch({
                type: 'TOGGLE_BFR',
                planId,
                weekId: menuState.weekId,
                workoutId: menuState.workoutId,
                workoutExerciseId: menuState.exerciseId,
                enabled: !menuEx.isBfr,
              })
            }
          }}
          sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography variant="inherit">BFR mode</Typography>
          <Switch
            size="small"
            edge="end"
            checked={Boolean(menuEx?.isBfr)}
            tabIndex={-1}
            disableRipple
            onClick={(event) => event.stopPropagation()}
            onChange={(_, checked) => {
              dispatch({
                type: 'TOGGLE_BFR',
                planId,
                weekId: menuState.weekId,
                workoutId: menuState.workoutId,
                workoutExerciseId: menuState.exerciseId,
                enabled: checked,
              })
            }}
            inputProps={{ 'aria-label': 'Toggle BFR mode' }}
          />
        </MenuItem>,
        <Divider key="div3" />,
      ]}
      <MenuItem
        dense
        sx={{ color: 'error.main' }}
        onClick={() => {
          if (menuState) {
            dispatch({ type: 'REMOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId })
          }
          onClose()
        }}
      >
        Delete exercise
      </MenuItem>
    </Menu>
  )
}
