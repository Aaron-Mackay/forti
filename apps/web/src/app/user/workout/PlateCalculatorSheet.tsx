'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { WeightUnit } from '@/lib/units';
import { kgToDisplay, displayToKg } from '@/lib/units';
import { calculatePlates, barWeightInUnit } from '@/lib/plateCalculator';

const PLATE_COLORS: Record<number, string> = {
  // kg
  25: '#c0392b',
  20: '#2980b9',
  15: '#f39c12',
  10: '#27ae60',
  5:  '#8e44ad',
  2.5: '#7f8c8d',
  1.25: '#bdc3c7',
  // lbs — keyed by lbs value for visual lookup
  45: '#c0392b',
  35: '#2980b9',
  10.01: '#27ae60', // 10 lbs — avoid collision with 10 kg key
};

function plateColor(weightInUnit: number, unit: WeightUnit): string {
  // Use the exact value for kg; approximate for lbs
  if (unit === 'lbs') {
    if (weightInUnit === 45) return '#c0392b';
    if (weightInUnit === 35) return '#2980b9';
    if (weightInUnit === 25) return '#f39c12';
    if (weightInUnit === 10) return '#27ae60';
    if (weightInUnit === 5)  return '#8e44ad';
    return '#7f8c8d';
  }
  return PLATE_COLORS[weightInUnit] ?? '#7f8c8d';
}

interface Props {
  /** Current weight in kg (the set's weight). Used as default target. */
  initialKg: number | null;
  unit: WeightUnit;
  onClose: () => void;
  /** Optional: fill the set's weight field with the selected value. */
  onUseWeight?: (kgValue: number) => void;
}

export default function PlateCalculatorSheet({ initialKg, unit, onClose, onUseWeight }: Props) {
  const initialDisplay = initialKg != null ? (kgToDisplay(initialKg, unit) ?? '') : '';
  const [targetStr, setTargetStr] = useState(
    initialDisplay !== '' ? String(initialDisplay % 1 === 0 ? initialDisplay : (initialDisplay as number).toFixed(1)) : ''
  );

  const targetDisplay = parseFloat(targetStr);
  const targetKg = !isNaN(targetDisplay) && targetDisplay > 0
    ? displayToKg(targetDisplay, unit)
    : null;

  const result = targetKg != null ? calculatePlates(targetKg, unit) : null;
  const barWeight = barWeightInUnit(unit);

  const achievableDisplay = result
    ? (unit === 'lbs'
        ? Math.round(result.achievableKg * 2.20462 * 10) / 10
        : result.achievableKg)
    : null;

  return (
    <Drawer
      anchor="bottom"
      open
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '85dvh',
          px: 2,
          pb: 3,
          pt: 1,
        },
      }}
    >
      {/* Handle + title */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Plate Calculator
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Target weight input */}
      <TextField
        label={`Target weight (${unit})`}
        value={targetStr}
        onChange={(e) => {
          if (/^\d*\.?\d*$/.test(e.target.value)) setTargetStr(e.target.value);
        }}
        autoFocus
        size="small"
        fullWidth
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        sx={{ mb: 2 }}
      />

      {result && (
        <>
          <Divider sx={{ mb: 2 }} />

          {/* Bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
              Bar
            </Typography>
            <Typography variant="body2">{barWeight} {unit}</Typography>
          </Box>

          {/* Plates per side */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80, pt: 0.5 }}>
              Each side
            </Typography>
            {result.platesPerSide.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {result.platesPerSide.map(({ weight, count }) =>
                  Array.from({ length: count }, (_, i) => (
                    <Chip
                      key={`${weight}-${i}`}
                      label={`${weight} ${unit}`}
                      size="small"
                      sx={{
                        bgcolor: plateColor(weight, unit),
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  ))
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Bar only
              </Typography>
            )}
          </Box>

          {/* Total */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
              Total
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {achievableDisplay} {unit}
              {result.hasRemainder && (
                <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                  (closest loadable)
                </Typography>
              )}
            </Typography>
          </Box>

          {onUseWeight && (
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                onUseWeight(result.achievableKg);
                onClose();
              }}
            >
              Use {achievableDisplay} {unit}
            </Button>
          )}
        </>
      )}

      {!result && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          Enter a target weight to see plate loading.
        </Typography>
      )}
    </Drawer>
  );
}
