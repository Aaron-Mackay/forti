'use client';

import {Box, Divider, Paper, Stack, TextField, Typography} from '@mui/material';
import {computeMacroGramsFromPercents, isMacroPercentSplitValid, sumMacroPercents} from '@lib/macroTargets';

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

function toNumberOrZero(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CoachWeekTargetsCard({values, onChange}: Props) {
  function set(field: keyof TargetValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({...values, [field]: e.target.value});
  }

  const sleepTotalMins = toNumberOrZero(values.sleep);
  const sleepHours = Math.floor(sleepTotalMins / 60);
  const sleepMins = sleepTotalMins % 60;

  function setSleepHours(e: React.ChangeEvent<HTMLInputElement>) {
    const h = Math.max(0, toNumberOrZero(e.target.value));
    onChange({...values, sleep: String(h * 60 + sleepMins)});
  }
  function setSleepMins(e: React.ChangeEvent<HTMLInputElement>) {
    const m = Math.min(59, Math.max(0, toNumberOrZero(e.target.value)));
    onChange({...values, sleep: String(sleepHours * 60 + m)});
  }

  const calories = toNumberOrZero(values.calories);
  const percents = {
    proteinPct: toNumberOrZero(values.proteinPct),
    carbsPct: toNumberOrZero(values.carbsPct),
    fatPct: toNumberOrZero(values.fatPct),
  };
  const grams = computeMacroGramsFromPercents(calories, percents);
  const pctTotal = sumMacroPercents(percents);
  const splitValid = isMacroPercentSplitValid(calories, percents);

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
        <Box sx={{display: 'flex', flexDirection: 'row', gap: 1.5}}>
          <TextField
            label="Steps"
            size="small"
            type="number"
            value={values.steps}
            onChange={set('steps')}
            slotProps={{htmlInput: {min: 0}}}
          />
          <Divider orientation="vertical" flexItem sx={{alignSelf: 'stretch', my: 0.5}}  />
          <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
            <TextField
              label="Sleep"
              size="small"
              type="number"
              value={sleepHours}
              onChange={setSleepHours}
              slotProps={{htmlInput: {min: 0}}}
              sx={{flex: 1, minWidth: 0}}
            />
            <Typography variant="body2" color="text.secondary">h</Typography>
            <TextField
              size="small"
              type="number"
              value={sleepMins}
              onChange={setSleepMins}
              slotProps={{htmlInput: {min: 0, max: 59}}}
              sx={{flex: 1, minWidth: 0, ml: 1}}
            />
            <Typography variant="body2" color="text.secondary">m</Typography>
          </Box>
        </Box>

        <Divider />

        <Box sx={{display: 'flex', alignItems: 'flex-start', gap: 1.5}}>
          <TextField
            label="Calories"
            size="small"
            type="number"
            value={values.calories}
            onChange={set('calories')}
            slotProps={{htmlInput: {min: 0}}}
            sx={{flex: '1 1 0', minWidth: '8ch', mr: 1}}
          />

          <Divider orientation="vertical" flexItem sx={{alignSelf: 'stretch', my: 0.5}} />

          {([
            {label: 'Protein %', field: 'proteinPct', g: grams.protein},
            {label: 'Carbs %',   field: 'carbsPct',   g: grams.carbs},
            {label: 'Fat %',     field: 'fatPct',     g: grams.fat},
          ] as const).map(({label, field, g}) => (
            <Box key={field} sx={{display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 0', minWidth: '14ch',}}>
              <TextField
                label={label}
                size="small"
                type="number"
                value={values[field]}
                onChange={set(field)}
                slotProps={{htmlInput: {min: 0, max: 100}}}
                sx={{minWidth: 0, flex: 1, ml: 1}}
              />
              <Typography variant="body2" color="text.secondary" sx={{whiteSpace: 'nowrap'}}>
                {g} g
              </Typography>
            </Box>
          ))}

          <Divider orientation="vertical" flexItem sx={{alignSelf: 'stretch', my: 0.5}} />

          <Box sx={{display: 'flex', alignItems: 'center', minHeight: 40, flexShrink: 0}}>
            <Typography variant="caption" color={splitValid ? 'text.secondary' : 'error.main'} fontWeight={600}>
              {pctTotal}%
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
