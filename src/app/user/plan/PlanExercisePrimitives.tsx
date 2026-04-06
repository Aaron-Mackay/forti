'use client'

import React from 'react'
import { Box, Chip, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { computeE1rm } from '@/lib/e1rm'

type ExerciseMetaInput = {
  repRange: string | null
  restTime: string | null
  targetRpe: number | null
  targetRir: number | null
}

export function buildExerciseMetaParts({
  repRange,
  restTime,
  targetRpe,
  targetRir,
}: ExerciseMetaInput) {
  return [
    repRange && `${repRange} reps`,
    restTime,
    targetRpe != null && `RPE ${targetRpe}`,
    targetRir != null && `${targetRir} RIR`,
  ].filter((part): part is string => Boolean(part))
}

export function ExerciseNameWithMeta({
  name,
  metaParts,
  index,
  isBfr = false,
}: {
  name: string
  metaParts: string[]
  index?: number
  isBfr?: boolean
}) {
  return (
    <>
      <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        <Box component="span">{index != null ? `${index + 1}. ${name}` : name}</Box>
        {isBfr && <Chip label="BFR" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />}
      </Typography>
      {metaParts.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          {metaParts.join(' · ')}
        </Typography>
      )}
    </>
  )
}

const compactInputSx: React.CSSProperties = {
  width: '3.4em',
  textAlign: 'center',
  border: '1px solid rgba(0,0,0,0.23)',
  borderRadius: '4px',
  padding: '3px 4px',
  fontSize: '0.78rem',
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  MozAppearance: 'textfield',
}

const compactSetRowSx = {
  display: 'flex',
  gap: 0.25,
  alignItems: 'center',
  justifyContent: 'center',
  mb: 0.25,
}

export function CompactSetEditor({
  label,
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  showE1rm = true,
}: {
  label?: string
  weight: number | null
  reps: number | null
  onWeightChange: (weight: number | null) => void
  onRepsChange: (reps: number) => void
  showE1rm?: boolean
}) {
  const e1rm = computeE1rm(weight, reps)

  return (
    <Box sx={compactSetRowSx}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', minWidth: '1em' }}>
          {label}
        </Typography>
      )}
      <input
        type="number"
        value={weight ?? ''}
        onChange={(event) => {
          const value = event.target.value === '' ? null : parseFloat(event.target.value)
          onWeightChange(isNaN(value as number) ? null : value)
        }}
        placeholder="kg"
        style={compactInputSx}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
        ×
      </Typography>
      <input
        type="number"
        value={reps ?? ''}
        onChange={(event) => {
          const value = parseInt(event.target.value, 10)
          if (!isNaN(value)) onRepsChange(value)
        }}
        placeholder="reps"
        style={compactInputSx}
      />
      {showE1rm && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', minWidth: '2.5em', textAlign: 'right' }}>
          {e1rm != null ? `~${Math.round(e1rm)}` : ''}
        </Typography>
      )}
    </Box>
  )
}

export function SetCountControls({
  canRemove,
  onAdd,
  onRemove,
  canRemoveDrop = false,
  onAddDrop,
  onRemoveDrop,
  layout = 'default',
}: {
  canRemove: boolean
  onAdd: () => void
  onRemove: () => void
  canRemoveDrop?: boolean
  onAddDrop?: () => void
  onRemoveDrop?: () => void
  layout?: 'default' | 'spread' | 'stacked'
}) {
  const rootSx: SxProps<Theme> =
    layout === 'spread'
      ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25, mt: 0.5, width: '100%' }
      : layout === 'stacked'
      ? { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.6, mt: 0.35, width: 'fit-content', mx: 'auto' }
      : { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.25, mt: 0.5, flexWrap: 'wrap' }

  const groupSx: SxProps<Theme> =
    layout === 'spread'
      ? { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, flex: 1 }
      : layout === 'stacked'
      ? { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.9 }
      : { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75 }

  return (
    <Box sx={rootSx}>
      <Box sx={groupSx}>
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}
          onClick={onAdd}
        >
          +
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Set
        </Typography>
        <Typography
          variant="caption"
          color={canRemove ? 'primary' : 'text.disabled'}
          sx={{ cursor: canRemove ? 'pointer' : 'default', fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}
          onClick={() => {
            if (canRemove) onRemove()
          }}
        >
          −
        </Typography>
      </Box>
      {onAddDrop && onRemoveDrop && (
        <Box sx={groupSx}>
          <Typography
            variant="caption"
            color="primary"
            sx={{ cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}
            onClick={onAddDrop}
          >
            +
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Drop
          </Typography>
          <Typography
            variant="caption"
            color={canRemoveDrop ? 'primary' : 'text.disabled'}
            sx={{ cursor: canRemoveDrop ? 'pointer' : 'default', fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}
            onClick={() => {
              if (canRemoveDrop) onRemoveDrop()
            }}
          >
            −
          </Typography>
        </Box>
      )}
    </Box>
  )
}
