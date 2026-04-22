'use client';

import {Box, Divider, Paper, Stack, TextField, Typography, useMediaQuery, useTheme} from '@mui/material';
import SleepHmInput from '@/components/SleepHmInput';
import MacroPercentRow from '@/components/MacroPercentRow';

export interface TargetValues {
  steps: string;
  sleep: string;
  calories: string;
  proteinPct: string;
  carbsPct: string;
  fatPct: string;
}

interface Props {
  values: TargetValues;
  onChange: (values: TargetValues) => void;
}

export default function CoachWeekTargetsCard({values, onChange}: Props) {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));

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
        <Box sx={{display: 'flex', flexDirection: 'row', gap: 1.5, width: '100%'}}>
          <TextField
            label="Steps"
            size="small"
            type="number"
            value={values.steps}
            onChange={e => onChange({...values, steps: e.target.value})}
            slotProps={{htmlInput: {min: 0}}}
            sx={{flex: isMobile ? null : 1}}
          />
          <Divider orientation="vertical" flexItem sx={{alignSelf: 'stretch', my: 0.5}}/>
          <SleepHmInput
            valueMins={values.sleep}
            onChange={sleep => onChange({...values, sleep})}
            sx={{flex: isMobile ? null : 1}}
          />
        </Box>

        <Divider/>

        <MacroPercentRow
          values={{calories: values.calories, proteinPct: values.proteinPct, carbsPct: values.carbsPct, fatPct: values.fatPct}}
          onChange={macro => onChange({...values, ...macro})}
        />
      </Stack>
    </Paper>
  );
}
