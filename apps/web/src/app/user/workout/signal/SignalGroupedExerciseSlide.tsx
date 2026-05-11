'use client';

import { signalTokens } from '@lib/signal/tokens';
import { useSettings } from '@lib/providers/SettingsProvider';
import type { WorkoutExerciseGroup } from '../groupWorkoutExercises';
import { SignalSetSection } from './SignalSetSection';
import { SignalAdvanceCta } from './SignalAdvanceCta';

type Props = {
  group: WorkoutExerciseGroup;
  handleSetUpdate: (workoutExerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  nextExerciseName: string | null;
  onAdvance: () => void;
  onSkip: () => void;
};

export function SignalGroupedExerciseSlide({ group, handleSetUpdate, nextExerciseName, onAdvance, onSkip }: Props) {
  const palette = signalTokens.surface.gym;
  const { settings } = useSettings();
  const ctaLabel = nextExerciseName ? `Next exercise → ${nextExerciseName}` : 'Finish workout';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: palette.bg, color: palette.ink, fontFamily: signalTokens.fontVar.body, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 16px' }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 10 }}>
          Superset · {group.items.length} exercises
        </div>

        {group.items.map((item, idx) => {
          const effectiveUnit = settings.exerciseUnitOverrides[String(item.exerciseId)] ?? settings.weightUnit;
          const isCardio = item.exercise.category === 'cardio';
          const isLast = idx === group.items.length - 1;

          return (
            <div key={item.id}>
              <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 6 }}>
                {item.exercise.name}
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkMid, flexWrap: 'wrap' }}>
                {item.restTime && <span>Rest {item.restTime}s</span>}
                {item.repRange && <span>Reps {item.repRange}</span>}
                {item.targetRpe != null && <span>RPE {item.targetRpe}</span>}
                {item.targetRir != null && <span>{item.targetRir} RIR</span>}
              </div>

              {isCardio ? (
                <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, padding: '10px 0' }}>
                  cardio — log duration or distance on exercise detail
                </div>
              ) : (
                <SignalSetSection ex={item} effectiveUnit={effectiveUnit} handleSetUpdate={handleSetUpdate} />
              )}

              {!isLast && (
                <div style={{ height: 1, background: palette.border, margin: '16px 0' }} />
              )}
            </div>
          );
        })}
      </div>

      <SignalAdvanceCta label={ctaLabel} onAdvance={onAdvance} onSkip={onSkip} />
    </div>
  );
}
