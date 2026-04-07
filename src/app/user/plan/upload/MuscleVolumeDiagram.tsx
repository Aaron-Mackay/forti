'use client'

import { useInsertionEffect } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import FrontBody from '@/components/front.svg'
import BackBody from '@/components/back.svg'
import type { ExerciseMuscle } from '@/types/dataTypes'

const VOLUME_COLOURS = ['#d9e4ec', '#b6d1e5', '#83b2d8', '#3f88c5', '#1c5d99']

function colourForValue(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) return null
  const ratio = value / maxValue
  if (ratio >= 0.85) return VOLUME_COLOURS[4]
  if (ratio >= 0.65) return VOLUME_COLOURS[3]
  if (ratio >= 0.45) return VOLUME_COLOURS[2]
  if (ratio >= 0.2) return VOLUME_COLOURS[1]
  return VOLUME_COLOURS[0]
}

export default function MuscleVolumeDiagram({ volumes }: { volumes: Partial<Record<ExerciseMuscle, number>> }) {
  const id = 'muscle-volume-summary'
  const maxValue = Math.max(0, ...Object.values(volumes).map((value) => value ?? 0))
  const css = Object.entries(volumes)
    .map(([muscle, value]) => {
      const colour = colourForValue(value ?? 0, maxValue)
      return colour ? `#${id} [data-muscle="${muscle}"] { fill: ${colour} !important; }` : null
    })
    .filter(Boolean)
    .join('\n')

  useInsertionEffect(() => {
    if (!css) return
    const el = document.createElement('style')
    el.textContent = css
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [css])

  return (
    <Stack spacing={1.5}>
      <Box
        id={id}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          minHeight: 220,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <FrontBody style={{ height: '100%', width: 'auto' }} />
        <BackBody style={{ height: '100%', width: 'auto' }} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Lower
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5, flex: 1 }}>
          {VOLUME_COLOURS.map((colour) => (
            <Box key={colour} sx={{ height: 8, borderRadius: 999, bgcolor: colour }} />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Higher
        </Typography>
      </Box>
    </Stack>
  )
}
