'use client';

import { useEffect, useRef, useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import type { SetPrisma } from '@/types/dataTypes';
import { displayToKg, kgToDisplay, type WeightUnit } from '@/lib/units';

const ROW_HEIGHT = 50;
const CELL_HEIGHT = 38;

type EffectiveUnit = WeightUnit | 'none';

function kgToInput(kg: number | null | undefined, unit: EffectiveUnit): string {
  if (kg == null) return '';
  if (unit === 'none') return kg % 1 === 0 ? kg.toString() : kg.toFixed(1);
  const v = kgToDisplay(kg, unit);
  if (v == null) return '';
  return v % 1 === 0 ? v.toString() : v.toFixed(1);
}

type Props = {
  set: SetPrisma;
  setIdx: number;
  effectiveUnit: EffectiveUnit;
  isActive: boolean;
  onWeightChange: (kgString: string) => void;
  onRepsChange: (value: string) => void;
};

export function SignalSetRow({
  set,
  setIdx,
  effectiveUnit,
  isActive,
  onWeightChange,
  onRepsChange,
}: Props) {
  const palette = signalTokens.surface.gym;
  const [weightStr, setWeightStr] = useState(() => kgToInput(set.weight, effectiveUnit));
  const [repsStr, setRepsStr] = useState(() => (set.reps == null ? '' : String(set.reps)));
  const weightFocused = useRef(false);
  const repsFocused = useRef(false);

  useEffect(() => {
    if (!weightFocused.current) setWeightStr(kgToInput(set.weight, effectiveUnit));
  }, [set.weight, effectiveUnit]);

  useEffect(() => {
    if (!repsFocused.current) setRepsStr(set.reps == null ? '' : String(set.reps));
  }, [set.reps]);

  const isComplete = set.weight != null && set.reps != null;
  const repsActive = isActive && !isComplete;

  const cellBase = {
    height: CELL_HEIGHT,
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: signalTokens.radii.cell,
    fontFamily: signalTokens.fontVar.cond,
    fontWeight: 700,
    fontSize: 19,
    color: palette.ink,
    textAlign: 'center' as const,
    width: '100%',
    fontVariantNumeric: 'tabular-nums' as const,
    outline: 'none',
    appearance: 'none' as const,
    padding: '0 6px',
    boxSizing: 'border-box' as const,
  };

  const repsCellStyle = repsActive
    ? {
        ...cellBase,
        border: `1.5px solid ${signalTokens.signal.base}`,
        background: signalTokens.signal.dim,
      }
    : cellBase;

  function handleWeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!/^\d*\.?\d*$/.test(raw)) return;
    setWeightStr(raw);
    if (raw === '') {
      onWeightChange('');
      return;
    }
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return;
    const kg = effectiveUnit === 'none' ? v : displayToKg(v, effectiveUnit);
    onWeightChange(kg.toString());
  }

  function handleRepsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!/^\d*$/.test(raw)) return;
    setRepsStr(raw);
    onRepsChange(raw);
  }

  return (
    <div
      data-active={isActive ? 'true' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr 1fr 28px',
        gap: 8,
        alignItems: 'center',
        height: ROW_HEIGHT,
        padding: '6px 0',
      }}
    >
      <div
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          color: palette.inkLight,
          textAlign: 'center',
        }}
      >
        {String(setIdx + 1).padStart(2, '0')}
      </div>
      <input
        inputMode="decimal"
        autoComplete="off"
        aria-label={`Set ${setIdx + 1} weight`}
        value={weightStr}
        onChange={handleWeightChange}
        onFocus={() => { weightFocused.current = true; }}
        onBlur={() => { weightFocused.current = false; setWeightStr(kgToInput(set.weight, effectiveUnit)); }}
        placeholder={effectiveUnit === 'none' ? '—' : effectiveUnit}
        style={cellBase}
      />
      <input
        inputMode="numeric"
        autoComplete="off"
        aria-label={`Set ${setIdx + 1} reps`}
        value={repsStr}
        onChange={handleRepsChange}
        onFocus={() => { repsFocused.current = true; }}
        onBlur={() => { repsFocused.current = false; setRepsStr(set.reps == null ? '' : String(set.reps)); }}
        placeholder="reps"
        style={repsCellStyle}
      />
      <div
        aria-hidden
        style={{
          width: 28,
          height: CELL_HEIGHT,
          display: 'grid',
          placeItems: 'center',
          color: isComplete ? signalTokens.signal.base : palette.inkLight,
        }}
      >
        {isComplete ? (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l4 4 10-10" />
          </svg>
        ) : null}
      </div>
    </div>
  );
}
