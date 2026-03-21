'use client';

import { useEffect, useRef, useState } from 'react';
import TextField from '@mui/material/TextField';
import type { WeightUnit } from '@/lib/units';
import { kgToDisplay, displayToKg } from '@/lib/units';

/** Format a kg value as a clean display string in the given unit. */
function kgToStr(kg: number | null | undefined, unit: WeightUnit): string {
  const v = kgToDisplay(kg, unit);
  if (v == null) return '';
  return v % 1 === 0 ? v.toString() : v.toFixed(1);
}

interface WeightInputProps {
  /** Current weight value stored in kg (null = empty). */
  valueKg: number | null | undefined;
  unit: WeightUnit;
  /** Called with the new value as a kg string (empty string = clear). */
  onChange: (kgString: string) => void;
  label?: string;
}

/**
 * A controlled weight TextField that manages the display-unit string locally.
 * The parent stores values in kg; this component handles the conversion.
 */
export default function WeightInput({ valueKg, unit, onChange, label = 'Weight' }: WeightInputProps) {
  const [inputStr, setInputStr] = useState(() => kgToStr(valueKg, unit));
  const isFocused = useRef(false);

  // Sync from parent when not focused (external updates, e.g. drop-set auto-fill)
  useEffect(() => {
    if (!isFocused.current) {
      setInputStr(kgToStr(valueKg, unit));
    }
  }, [valueKg, unit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!/^\d*\.?\d*$/.test(raw)) return;
    setInputStr(raw);
    if (raw === '') {
      onChange('');
      return;
    }
    const displayVal = parseFloat(raw);
    if (!isNaN(displayVal)) {
      const kg = displayToKg(displayVal, unit);
      onChange(kg.toString());
    }
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    // Re-format on blur to clean up (e.g. trailing dot)
    setInputStr(kgToStr(valueKg, unit));
  };

  return (
    <TextField
      label={`${label} (${unit})`}
      size="small"
      autoComplete="off"
      value={inputStr}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      sx={{ minWidth: 90, '& input': { textAlign: 'center' } }}
      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
    />
  );
}
