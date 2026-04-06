'use client'

import { MenuItem, Switch, Typography } from '@mui/material'
import React from 'react'

export function ExerciseMenuActionItem({
  children,
  color,
  dense = false,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode
  color?: 'error.main'
  dense?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <MenuItem dense={dense} disabled={disabled} sx={color ? { color } : undefined} onClick={onClick}>
      {children}
    </MenuItem>
  )
}

export function ExerciseMenuToggleItem({
  label,
  checked,
  dense = false,
  onToggle,
}: {
  label: string
  checked: boolean
  dense?: boolean
  onToggle: (checked: boolean) => void
}) {
  return (
    <MenuItem
      dense={dense}
      sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
      onClick={() => onToggle(!checked)}
    >
      <Typography variant="inherit">{label}</Typography>
      <Switch
        size="small"
        edge="end"
        checked={checked}
        tabIndex={-1}
        disableRipple
        onClick={(event) => event.stopPropagation()}
        onChange={(_, nextChecked) => onToggle(nextChecked)}
        inputProps={{ 'aria-label': `Toggle ${label}` }}
      />
    </MenuItem>
  )
}

export function ExerciseMenuDropAndBfrItems({
  dense = false,
  isCardio,
  dropSetsEnabled,
  isBfr,
  onToggleDropSets,
  onToggleBfr,
}: {
  dense?: boolean
  isCardio: boolean
  dropSetsEnabled: boolean
  isBfr: boolean
  onToggleDropSets: (checked: boolean) => void
  onToggleBfr: (checked: boolean) => void
}) {
  if (isCardio) return null

  return (
    <>
      <ExerciseMenuToggleItem
        label="Enable drop sets"
        checked={dropSetsEnabled}
        dense={dense}
        onToggle={onToggleDropSets}
      />
      <ExerciseMenuToggleItem
        label="BFR mode"
        checked={isBfr}
        dense={dense}
        onToggle={onToggleBfr}
      />
    </>
  )
}

export function ExerciseMenuMoveItems({
  dense = false,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  dense?: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <>
      <ExerciseMenuActionItem dense={dense} disabled={!canMoveUp} onClick={onMoveUp}>
        Move up
      </ExerciseMenuActionItem>
      <ExerciseMenuActionItem dense={dense} disabled={!canMoveDown} onClick={onMoveDown}>
        Move down
      </ExerciseMenuActionItem>
    </>
  )
}
