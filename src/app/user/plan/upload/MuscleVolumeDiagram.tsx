'use client'

import { Box, Stack, Typography } from '@mui/material'
import type { ExerciseMuscle } from '@/types/dataTypes'
import MuscleBodyHeatmap, { MUSCLE_BLUE_SHADES } from '@/components/MuscleBodyHeatmap'

export default function MuscleVolumeDiagram({ volumes }: { volumes: Partial<Record<ExerciseMuscle, number>> }) {
  const id = 'muscle-volume-summary'

  return (
    <Stack spacing={1.5}>
      <MuscleBodyHeatmap
        id={id}
        values={volumes}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          minHeight: 220,
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
        bodyStyle={{ height: '100%', width: 'auto' }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Lower
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${MUSCLE_BLUE_SHADES.length}, 1fr)`, gap: 0.5, flex: 1 }}>
          {MUSCLE_BLUE_SHADES.map((colour) => (
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
