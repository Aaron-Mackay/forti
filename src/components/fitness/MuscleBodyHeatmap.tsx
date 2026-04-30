'use client'

import { useInsertionEffect } from 'react'
import type { CSSProperties } from 'react'
import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import FrontBody from '@/components/fitness/front.svg'
import BackBody from '@/components/fitness/back.svg'

export const MUSCLE_BLUE_SHADES = ['#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'] as const

export function getBlueShade(value: number): string {
  if (value >= 7) return MUSCLE_BLUE_SHADES[3]
  if (value >= 5) return MUSCLE_BLUE_SHADES[2]
  if (value >= 3) return MUSCLE_BLUE_SHADES[1]
  if (value >= 1) return MUSCLE_BLUE_SHADES[0]
  return ''
}

type MuscleBodyHeatmapProps = {
  id: string
  values: Partial<Record<string, number>>
  sx?: SxProps<Theme>
  bodyStyle?: CSSProperties
  onClick?: () => void
}

export default function MuscleBodyHeatmap({ id, values, sx, bodyStyle, onClick }: MuscleBodyHeatmapProps) {
  const css = Object.entries(values)
    .map(([muscle, value]) => {
      const shade = getBlueShade(value ?? 0)
      if (!shade) return ''
      return `#${id} [data-muscle="${muscle}"] { fill: ${shade} !important; }`
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
    <Box id={id} onClick={onClick} sx={sx}>
      <FrontBody style={bodyStyle} />
      <BackBody style={bodyStyle} />
    </Box>
  )
}
