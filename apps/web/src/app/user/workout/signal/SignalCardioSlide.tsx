'use client';

import { signalTokens } from '@lib/signal/tokens';
import type { WorkoutExercisePrisma } from '@/types/dataTypes';
import type { PreviousCardio } from '../CardioSlide';
import { SignalAdvanceCta } from './SignalAdvanceCta';

const palette = signalTokens.surface.gym;

function formatPace(durationMin: number, distanceKm: number): string {
  const paceMin = durationMin / distanceKm;
  const mins = Math.floor(paceMin);
  const secs = Math.round((paceMin - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

function CardioField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value?.toString() ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') { onChange(null); return; }
          const n = parseFloat(raw);
          if (!isNaN(n)) onChange(n);
        }}
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cell,
          color: palette.ink,
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 20,
          fontWeight: 600,
          padding: '10px 12px',
          textAlign: 'center',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    </div>
  );
}

export function SignalCardioSlide({
  ex,
  onCardioUpdate,
  previousCardio,
  nextExerciseName,
  onAdvance,
  onSkip,
}: {
  ex: WorkoutExercisePrisma;
  onCardioUpdate: (field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance', value: number | null) => void;
  previousCardio: PreviousCardio | null | undefined;
  nextExerciseName: string | null;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const duration = ex.cardioDuration;
  const distance = ex.cardioDistance;

  const pace =
    duration && distance && duration > 0 && distance > 0
      ? formatPace(duration, distance)
      : null;

  const prevSummary = (() => {
    if (!previousCardio) return null;
    const parts: string[] = [];
    if (previousCardio.cardioDuration != null) parts.push(`${previousCardio.cardioDuration} min`);
    if (previousCardio.cardioDistance != null) parts.push(`${previousCardio.cardioDistance} km`);
    return parts.length > 0 ? parts.join(' · ') : null;
  })();

  const ctaLabel = nextExerciseName ? `Next exercise → ${nextExerciseName}` : 'Finish workout';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: palette.bg, color: palette.ink, fontFamily: signalTokens.fontVar.body, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 16px' }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
          Cardio
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 16 }}>
          {ex.exercise.name}
        </div>

        {prevSummary && (
          <div
            style={{
              marginBottom: 18,
              padding: '10px 12px',
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.card,
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 12,
              color: palette.inkMid,
            }}
          >
            <span style={{ color: palette.inkLight }}>Last session · </span>
            {prevSummary}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CardioField
            label="Duration (min)"
            value={ex.cardioDuration}
            onChange={(v) => onCardioUpdate('cardioDuration', v)}
          />
          <CardioField
            label="Distance (km)"
            value={ex.cardioDistance}
            onChange={(v) => onCardioUpdate('cardioDistance', v)}
          />
          <CardioField
            label="Resistance / Incline"
            value={ex.cardioResistance}
            onChange={(v) => onCardioUpdate('cardioResistance', v)}
          />
        </div>

        {pace && (
          <div style={{ marginTop: 16, fontFamily: signalTokens.fontVar.mono, fontSize: 13, color: signalTokens.signal.base, fontWeight: 600 }}>
            {pace}
          </div>
        )}
      </div>

      <SignalAdvanceCta label={ctaLabel} onAdvance={onAdvance} onSkip={onSkip} />
    </div>
  );
}
