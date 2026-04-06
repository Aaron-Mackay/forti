'use client';

import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

interface Props {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
}

const LABELS: Record<number, string> = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };

export default function RatingField({ label, value, onChange }: Props) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 0.5 }}>{label}</Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_e, v) => { if (v !== null) onChange(v as number); }}
        size="small"
        sx={{
          flexWrap: 'wrap',
          gap: 0.5,
          display: 'flex',
          width: '100%',
          // Override MUI group selectors that strip borders from non-first/last buttons
          '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px !important',
            '&.Mui-selected': { borderColor: 'primary.main' },
          },
        }}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <ToggleButton
            key={n}
            value={n}
            aria-label={LABELS[n]}
            sx={{ minWidth: 44, flex: '1 1 auto' }}
          >
            {n}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {value !== null && (
        <Typography variant="caption" color="text.secondary">{LABELS[value]}</Typography>
      )}
    </Box>
  );
}
