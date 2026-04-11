'use client';

import { useEffect, useRef, useState } from 'react';
import TextField from '@mui/material/TextField';
import type { WeightUnit } from '@/lib/units';
import { kgToDisplay, displayToKg } from '@/lib/units';
import type { ExerciseUnitOverride } from '@/types/settingsTypes';

/** Effective unit for display: global unit, per-exercise override, or 'none' (machine). */
export type EffectiveUnit = WeightUnit | 'none';

/** Format a kg value as a clean display string in the given unit. */
function kgToStr(kg: number | null | undefined, unit: EffectiveUnit): string {
  if (unit === 'none') {
    if (kg == null) return '';
    return kg % 1 === 0 ? kg.toString() : kg.toFixed(1);
  }
  const v = kgToDisplay(kg, unit);
  if (v == null) return '';
  return v % 1 === 0 ? v.toString() : v.toFixed(1);
}

const LONG_PRESS_MS = 600;

interface WeightInputProps {
  /** Current weight value stored in kg (null = empty). */
  valueKg: number | null | undefined;
  unit: EffectiveUnit;
  /** Called with the new value as a kg string (empty string = clear). */
  onChange: (kgString: string) => void;
  /** Called after a long-press on the field — use to open a unit override menu. */
  onLongPress?: (anchorEl: HTMLElement) => void;
  label?: string;
}

/**
 * A controlled weight TextField that manages the display-unit string locally.
 * The parent stores values in kg; this component handles the conversion.
 * Long-pressing the field fires onLongPress for a unit override menu.
 */
export default function WeightInput({ valueKg, unit, onChange, onLongPress, label }: WeightInputProps) {
  const [inputStr, setInputStr] = useState(() => kgToStr(valueKg, unit));
  const isFocused = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      const kg = unit === 'none' ? displayVal : displayToKg(displayVal, unit);
      onChange(kg.toString());
    }
  };

  const handleFocus = () => { isFocused.current = true; };

  const handleBlur = () => {
    isFocused.current = false;
    setInputStr(kgToStr(valueKg, unit));
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = () => {
    if (!onLongPress) return;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      const el = containerRef.current;
      if (el) onLongPress(el);
    }, LONG_PRESS_MS);
  };

  const unitLabel = label ?? (unit === 'none' ? 'Weight' : unit);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
    >
      <TextField
        label={unitLabel}
        size="small"
        autoComplete="off"
        value={inputStr}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        sx={{ minWidth: 90, '& input': { textAlign: 'center' } }}
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
      />
    </div>
  );
}

export type { ExerciseUnitOverride };
