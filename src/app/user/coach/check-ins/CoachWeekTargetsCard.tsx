'use client';

import {Box, Divider, Paper, Stack, TextField, Typography} from '@mui/material';

export interface TargetValues {
  steps: string;
  sleep: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

interface Props {
  values: TargetValues;
  onChange: (values: TargetValues) => void;
}

export default function CoachWeekTargetsCard({values, onChange}: Props) {
  function set(field: keyof TargetValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({...values, [field]: e.target.value});
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: {xs: 2, sm: 2.5},
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{display: 'block', mb: 1.5}}>
        Targets
      </Typography>

      <Stack spacing={1.5}>
        <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5}}>
          <TextField
            label="Steps"
            size="small"
            type="number"
            value={values.steps}
            onChange={set('steps')}
            slotProps={{htmlInput: {min: 0}}}
          />
          <TextField
            label="Sleep (mins)"
            size="small"
            type="number"
            value={values.sleep}
            onChange={set('sleep')}
            slotProps={{htmlInput: {min: 0}}}
          />
        </Box>

        <Divider />

        <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5}}>
          <TextField
            label="Calories"
            size="small"
            type="number"
            value={values.calories}
            onChange={set('calories')}
            slotProps={{htmlInput: {min: 0}}}
          />
          <TextField
            label="Protein (g)"
            size="small"
            type="number"
            value={values.protein}
            onChange={set('protein')}
            slotProps={{htmlInput: {min: 0}}}
          />
          <TextField
            label="Carbs (g)"
            size="small"
            type="number"
            value={values.carbs}
            onChange={set('carbs')}
            slotProps={{htmlInput: {min: 0}}}
          />
          <TextField
            label="Fat (g)"
            size="small"
            type="number"
            value={values.fat}
            onChange={set('fat')}
            slotProps={{htmlInput: {min: 0}}}
          />
        </Box>
      </Stack>
    </Paper>
  );
}
