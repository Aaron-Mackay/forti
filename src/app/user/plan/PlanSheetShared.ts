'use client'

import { WorkoutEditorAction } from '@lib/useWorkoutEditor'
import { ActionDispatch, CSSProperties } from 'react'

export interface MenuState {
  anchor: HTMLElement
  weekId: number
  workoutId: number
  exerciseId: number
  exerciseIndex: number
  exerciseCount: number
  isCardio: boolean
}

export type WorkoutEditorDispatch = ActionDispatch<[WorkoutEditorAction]>

export const inputSx: CSSProperties = {
  width: '3.2em',
  textAlign: 'center',
  border: '1px solid rgba(0,0,0,0.23)',
  borderRadius: '4px',
  padding: '2px 3px',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  MozAppearance: 'textfield',
}

export const cellSx: CSSProperties = {
  padding: '4px 6px',
  fontSize: '0.75rem',
  borderBottom: '1px solid var(--mui-palette-divider, #e0e0e0)',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
}

export const headerCellSx: CSSProperties = {
  padding: '4px 6px',
  fontSize: '0.68rem',
  fontWeight: 600,
  color: 'var(--mui-palette-text-secondary, #666)',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--mui-palette-divider, #e0e0e0)',
  textAlign: 'center',
  backgroundColor: 'var(--mui-palette-background-paper, #fff)',
}
