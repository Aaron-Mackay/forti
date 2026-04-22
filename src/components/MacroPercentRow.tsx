'use client';

import {Box, Divider, Stack, TextField, Typography, useMediaQuery, useTheme} from '@mui/material';
import {computeMacroGramsFromPercents, isMacroPercentSplitValid, sumMacroPercents} from '@lib/macroTargets';

export interface MacroPercentValues {
  calories: string;
  proteinPct: string;
  carbsPct: string;
  fatPct: string;
}

interface Props {
  values: MacroPercentValues;
  onChange?: (values: MacroPercentValues) => void;
  disabled?: boolean;
}

function toNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const MACROS = [
  {label: 'Protein %', shortLabel: 'P%', field: 'proteinPct'} as const,
  {label: 'Carbs %', shortLabel: 'C%', field: 'carbsPct'} as const,
  {label: 'Fat %', shortLabel: 'F%', field: 'fatPct'} as const,
];

export default function MacroPercentRow({values, onChange, disabled}: Props) {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));

  const calories = toNum(values.calories);
  const percents = {
    proteinPct: toNum(values.proteinPct),
    carbsPct: toNum(values.carbsPct),
    fatPct: toNum(values.fatPct),
  };
  const grams = computeMacroGramsFromPercents(calories, percents);
  const pctTotal = sumMacroPercents(percents);
  const splitValid = isMacroPercentSplitValid(calories, percents);
  const gramValues = [grams.protein, grams.carbs, grams.fat];

  function set(field: keyof MacroPercentValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange?.({...values, [field]: e.target.value});
  }

  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        <Box sx={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5, alignItems: 'center'}}>
          <TextField
            label="Calories"
            size="small"
            type="number"
            value={values.calories}
            onChange={set('calories')}
            disabled={disabled}
            slotProps={{htmlInput: {min: 0}}}
          />
          <Typography variant="caption" color={splitValid ? 'text.secondary' : 'error.main'} fontWeight={600}
                      sx={{textAlign: 'center'}}>
            {pctTotal}%
          </Typography>
        </Box>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
          {MACROS.map(({shortLabel, field}, i) => (
            <Box key={field} sx={{display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 33%'}}>
              <TextField
                label={shortLabel}
                size="small"
                type="number"
                value={values[field]}
                onChange={set(field)}
                disabled={disabled}
                slotProps={{htmlInput: {min: 0, max: 100}}}
                sx={{width: '7ch'}}
              />
              <Typography variant="body2" color="text.secondary" sx={{whiteSpace: 'nowrap', ml: 'auto'}}>
                {gramValues[i]} g
              </Typography>
            </Box>
          ))}
        </Box>
      </Stack>
    );
  }

  return (
    <Box sx={{display: 'flex', alignItems: 'flex-start', gap: 1.5}}>
      <TextField
        label="Calories"
        size="small"
        type="number"
        value={values.calories}
        onChange={set('calories')}
        disabled={disabled}
        slotProps={{htmlInput: {min: 0}}}
        sx={{flex: '1 1 0', minWidth: '8ch', mr: 1}}
      />
      <Divider orientation="vertical" flexItem sx={{alignSelf: 'stretch', my: 0.5}}/>
      {MACROS.map(({label, field}, i) => (
        <Box key={field} sx={{display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 0', minWidth: '14ch'}}>
          <TextField
            label={label}
            size="small"
            type="number"
            value={values[field]}
            onChange={set(field)}
            disabled={disabled}
            slotProps={{htmlInput: {min: 0, max: 100}}}
            sx={{minWidth: 0, flex: 1, ml: 1}}
          />
          <Typography variant="body2" color="text.secondary" sx={{whiteSpace: 'nowrap'}}>
            {gramValues[i]} g
          </Typography>
        </Box>
      ))}
      <Divider orientation="vertical" flexItem sx={{alignSelf: 'stretch', my: 0.5}}/>
      <Box sx={{display: 'flex', alignItems: 'center', minHeight: 40, flexShrink: 0}}>
        <Typography variant="caption" color={splitValid ? 'text.secondary' : 'error.main'} fontWeight={600}>
          {pctTotal}%
        </Typography>
      </Box>
    </Box>
  );
}
