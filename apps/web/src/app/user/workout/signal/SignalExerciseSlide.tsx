'use client';

import { useMemo, useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { useSettings } from '@lib/providers/SettingsProvider';
import { formatWeight } from '@/lib/units';
import type { WorkoutExercisePrisma } from '@/types/dataTypes';
import type { UserExerciseNote } from '@/generated/prisma/browser';
import type { PreviousExerciseHistory, E1rmHistoryPoint } from '@lib/contracts/exerciseHistory';
import { SignalSetSection } from './SignalSetSection';
import { SignalExerciseDetailSheet } from './SignalExerciseDetailSheet';
import { SignalAdvanceCta } from './SignalAdvanceCta';

type Props = {
  ex: WorkoutExercisePrisma;
  userExerciseNote: UserExerciseNote | undefined;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  handleSetUpdate: (workoutExerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  previousWorkout: PreviousExerciseHistory | undefined;
  history: E1rmHistoryPoint[] | null;
  nextExerciseName: string | null;
  onAdvance: () => void;
  onSkip: () => void;
  onExcludeFromHistoryChange?: (workoutExerciseId: number, excluded: boolean) => void;
};

export function SignalExerciseSlide({
  ex,
  userExerciseNote,
  onFormCueBlur,
  handleSetUpdate,
  previousWorkout,
  history,
  nextExerciseName,
  onAdvance,
  onSkip,
  onExcludeFromHistoryChange,
}: Props) {
  const palette = signalTokens.surface.gym;
  const { settings } = useSettings();
  const override = settings.exerciseUnitOverrides[String(ex.exerciseId)] ?? null;
  const effectiveUnit = override ?? settings.weightUnit;

  const [detailOpen, setDetailOpen] = useState(false);
  const [formCue, setFormCue] = useState(userExerciseNote?.note ?? '');

  const lastWorkout = previousWorkout?.workouts[0];
  const lastSummary = useMemo(() => {
    if (!lastWorkout) return null;
    const dateLabel = lastWorkout.completedAt
      ? new Date(lastWorkout.completedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      : 'last';
    const sets = lastWorkout.sets;
    const top = sets.reduce<{ weight: number | null; reps: number | null }>(
      (acc, s) => {
        if (s.weight == null || s.reps == null) return acc;
        if (acc.weight == null || s.weight > acc.weight || (s.weight === acc.weight && (acc.reps ?? 0) < s.reps)) {
          return { weight: s.weight, reps: s.reps };
        }
        return acc;
      },
      { weight: null, reps: null }
    );
    const volume = sets.reduce((sum, s) => {
      if (s.weight != null && s.reps != null) return sum + s.weight * s.reps;
      return sum;
    }, 0);
    const unit = effectiveUnit === 'none' ? 'kg' : effectiveUnit;
    const topSetLabel = top.weight != null && top.reps != null ? `${formatWeight(top.weight, unit)} × ${top.reps}` : null;
    const volumeLabel = volume > 0 ? `${formatWeight(volume, unit)}` : null;
    return { dateLabel, topSetLabel, volumeLabel };
  }, [lastWorkout, effectiveUnit]);

  const ctaLabel = nextExerciseName ? `Next exercise → ${nextExerciseName}` : 'Finish workout';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: palette.bg, color: palette.ink, fontFamily: signalTokens.fontVar.body, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 16px' }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
          Exercise {ex.order}
        </div>
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: palette.ink,
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            fontFamily: signalTokens.fontVar.cond,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.05,
            borderBottom: `1px dashed ${palette.borderStrong}`,
            paddingBottom: 4,
          }}
          aria-haspopup="dialog"
          aria-expanded={detailOpen}
        >
          <span>{ex.exercise.name}</span>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={palette.inkMid} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </button>
        <div style={{ marginTop: 6, fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          Tap for form notes &amp; history
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 14, fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkMid, flexWrap: 'wrap' }}>
          <span>Rest {ex.restTime}s</span>
          <span>Reps {ex.repRange}</span>
          {ex.targetRpe != null && <span>RPE {ex.targetRpe}</span>}
          {ex.targetRir != null && <span>{ex.targetRir} RIR</span>}
        </div>

        {lastSummary && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.card,
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 12,
              color: palette.inkMid,
              fontVariantNumeric: 'tabular-nums',
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: palette.inkLight }}>Last {lastSummary.dateLabel}</span>
            {lastSummary.topSetLabel && <span style={{ color: palette.ink, fontWeight: 600 }}>top {lastSummary.topSetLabel}</span>}
            {lastSummary.volumeLabel && <span>{lastSummary.volumeLabel} volume</span>}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <SignalSetSection ex={ex} effectiveUnit={effectiveUnit} handleSetUpdate={handleSetUpdate} />
        </div>
      </div>

      <SignalAdvanceCta label={ctaLabel} onAdvance={onAdvance} onSkip={onSkip} />

      <SignalExerciseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        ex={ex}
        effectiveUnit={effectiveUnit}
        previousWorkout={previousWorkout}
        history={history}
        formCue={formCue}
        onFormCueChange={setFormCue}
        onFormCueCommit={(value) => onFormCueBlur(ex.exerciseId, value)}
        onExcludeFromHistoryChange={onExcludeFromHistoryChange}
      />
    </div>
  );
}
