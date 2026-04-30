'use client';

import {Box, TextField} from '@mui/material';
import type {WorkoutExercisePrisma} from '@/types/dataTypes';

type Props = {
  ex: WorkoutExercisePrisma;
  onCardioUpdate: (field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance', value: number | null) => void;
  mt?: number;
};

export default function CardioInputsSection({ex, onCardioUpdate, mt = 1}: Props) {
  const handleNumberInput = (field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance', raw: string) => {
    if (raw === '') {
      onCardioUpdate(field, null);
      return;
    }
    const n = parseFloat(raw);
    if (!isNaN(n)) onCardioUpdate(field, n);
  };

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, mt}}>
      <TextField
        label="Duration (min)"
        size="small"
        autoComplete="off"
        inputProps={{inputMode: 'decimal', pattern: '[0-9.]*'}}
        value={ex.cardioDuration?.toString() ?? ''}
        onChange={e => handleNumberInput('cardioDuration', e.target.value)}
        sx={{'& input': {textAlign: 'center'}}}
      />
      <TextField
        label="Distance (km)"
        size="small"
        autoComplete="off"
        inputProps={{inputMode: 'decimal', pattern: '[0-9.]*'}}
        value={ex.cardioDistance?.toString() ?? ''}
        onChange={e => handleNumberInput('cardioDistance', e.target.value)}
        sx={{'& input': {textAlign: 'center'}}}
      />
      <TextField
        label="Avg. Resistance / Incline"
        size="small"
        autoComplete="off"
        inputProps={{inputMode: 'decimal', pattern: '[0-9.]*'}}
        value={ex.cardioResistance?.toString() ?? ''}
        onChange={e => handleNumberInput('cardioResistance', e.target.value)}
        sx={{'& input': {textAlign: 'center'}}}
      />
    </Box>
  );
}
