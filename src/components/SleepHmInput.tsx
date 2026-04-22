'use client';

import type {SxProps, Theme} from '@mui/material';
import {Box, TextField, Typography} from '@mui/material';

interface Props {
  valueMins: string;
  onChange: (mins: string) => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

function toSafeInt(s: string, max?: number): number {
  const n = parseInt(s, 10);
  const v = isNaN(n) ? 0 : Math.max(0, n);
  return max !== undefined ? Math.min(max, v) : v;
}

export default function SleepHmInput({valueMins, onChange, disabled, sx}: Props) {
  const total = toSafeInt(valueMins);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  return (
    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, ...sx as object}}>
      <TextField
        label="Sleep"
        size="small"
        type="number"
        value={hours}
        onChange={e => onChange(String(toSafeInt(e.target.value) * 60 + mins))}
        disabled={disabled}
        slotProps={{htmlInput: {min: 0}}}
        sx={{flex: 1, minWidth: 0}}
      />
      <Typography variant="body2" color="text.secondary">h</Typography>
      <TextField
        size="small"
        type="number"
        value={mins}
        onChange={e => onChange(String(hours * 60 + toSafeInt(e.target.value, 59)))}
        disabled={disabled}
        slotProps={{htmlInput: {min: 0, max: 59}}}
        sx={{flex: 1, minWidth: 0}}
      />
      <Typography variant="body2" color="text.secondary">m</Typography>
    </Box>
  );
}
