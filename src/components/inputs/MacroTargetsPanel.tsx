'use client';

import {Box, InputAdornment, Stack, TextField, Typography, useMediaQuery, useTheme} from '@mui/material';
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
  {label: 'Protein', field: 'proteinPct', color: '#d70000'} as const,
  {label: 'Carbs', field: 'carbsPct', color: '#45b700'} as const,
  {label: 'Fat', field: 'fatPct', color: '#7a4fcb'} as const,
];

export default function MacroTargetsPanel({values, onChange, disabled}: Props) {
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

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 250px) minmax(0, 1fr)',
        gap: {xs: 2, sm: 1.5},
        alignItems: 'center',
      }}
    >
      <MacroDonut
        caloriesValue={values.calories}
        percents={percents}
        onCaloriesChange={set('calories')}
        disabled={disabled}
      />

      <Stack spacing={1.25} sx={{pt: 4}}>
        {MACROS.map(({label, field, color}, i) => (
          <Box
            key={field}
            sx={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(8ch, 1fr) minmax(8ch, auto) 8ch' : 'minmax(8ch, 1fr) minmax(8ch, 1fr)  4ch',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              <Box sx={{width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0}}/>
              <Typography variant="body1">{label}</Typography>
            </Box>
            <TextField
              size="small"
              type="number"
              variant="standard"
              value={values[field]}
              onChange={set(field)}
              disabled={disabled}
              slotProps={{htmlInput: {'aria-label': `${label} percent`, min: 0, max: 100}, input: {
                  endAdornment: <InputAdornment position='end'>%</InputAdornment>
                }}}
              sx={{width: '7ch', '& input': { textAlign: 'right', pb: 0, }}}
            />
            <Typography variant="body2" color="text.secondary" sx={{whiteSpace: 'nowrap', minWidth: 'fit-content', textAlign:'right'}}>
              {gramValues[i]} g
            </Typography>
          </Box>
        ))}

        <Typography variant="caption" color={splitValid ? 'text.secondary' : 'error.main'} fontWeight={600} align="right">
          Macro split: {pctTotal}%
        </Typography>
      </Stack>
    </Box>
  );
}

function MacroDonut({
                     caloriesValue,
                     percents,
                     onCaloriesChange,
                     disabled,
                   }: {
  caloriesValue: string;
  percents: { proteinPct: number; carbsPct: number; fatPct: number };
  onCaloriesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  const macros = [
    {pct: Math.max(0, percents.proteinPct), color: MACROS[0].color},
    {pct: Math.max(0, percents.carbsPct), color: MACROS[1].color},
    {pct: Math.max(0, percents.fatPct), color: MACROS[2].color},
  ];
  const size = 220;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%'}}>
      <Box sx={{position: 'relative', width: size, height: size, flexShrink: 0}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Macro targets preview">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(120,120,120,0.2)"
            strokeWidth={stroke}
          />
          {macros.map((macro, index) => {
            const segment = (macro.pct / 100) * circumference;
            const segmentOffset = offset;
            offset += segment;
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={macro.color}
                strokeWidth={stroke}
                strokeLinecap="butt"
                strokeDasharray={`${segment} ${circumference - segment}`}
                strokeDashoffset={-segmentOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </svg>

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              minWidth: 140,
              px: 1.5,
              py: 1.5,
              textAlign: 'center',
            }}
          >
            <TextField
              type="number"
              variant="standard"
              value={caloriesValue}
              onChange={onCaloriesChange}
              disabled={disabled}
              slotProps={{htmlInput: {min: 0, 'aria-label': 'Energy target'}}}
              sx={{width: '10ch', '& input': { textAlign: 'center', pb: 0, fontSize: 24 },}}
            />
            <Typography variant="body2" color="text.secondary">
              kcal
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
