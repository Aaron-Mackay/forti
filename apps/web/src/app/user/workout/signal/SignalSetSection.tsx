'use client';

import { useMemo } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import type { WorkoutExercisePrisma } from '@/types/dataTypes';
import type { WeightUnit } from '@/lib/units';
import { SignalSetRow } from './SignalSetRow';

type EffectiveUnit = WeightUnit | 'none';

type Props = {
  ex: WorkoutExercisePrisma;
  effectiveUnit: EffectiveUnit;
  handleSetUpdate: (workoutExerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
};

export function SignalSetSection({ ex, effectiveUnit, handleSetUpdate }: Props) {
  const palette = signalTokens.surface.gym;
  const sortedSets = useMemo(
    () => [...ex.sets].filter((s) => !s.isDropSet).sort((a, b) => a.order - b.order),
    [ex.sets]
  );

  const activeIdx = sortedSets.findIndex((s) => s.weight == null || s.reps == null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '24px 1fr 1fr 28px',
          gap: 8,
          padding: '0 0 6px',
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 10,
          color: palette.inkLight,
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        <div style={{ textAlign: 'center' }}>#</div>
        <div style={{ textAlign: 'center' }}>{effectiveUnit === 'none' ? 'load' : effectiveUnit}</div>
        <div style={{ textAlign: 'center' }}>reps</div>
        <div />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sortedSets.map((set, i) => (
          <SignalSetRow
            key={set.id}
            set={set}
            setIdx={i}
            effectiveUnit={effectiveUnit}
            isActive={i === activeIdx}
            onWeightChange={(value) => handleSetUpdate(ex.id, i, 'weight', value)}
            onRepsChange={(value) => handleSetUpdate(ex.id, i, 'reps', value)}
          />
        ))}
      </div>
    </div>
  );
}
