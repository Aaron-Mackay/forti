'use client';

import { signalTokens } from '@lib/signal/tokens';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import MuscleHighlight from '@/components/fitness/MuscleHighlight';
import type { WorkoutPrisma } from '@/types/dataTypes';

const palette = signalTokens.surface.gym;

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function muscleDisplayName(muscle: string): string {
  return muscle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function SignalCompletionSheet({
  workout,
  weekWorkoutsCompleted,
  weekWorkoutsTotal,
  onClose,
}: {
  workout: WorkoutPrisma;
  weekWorkoutsCompleted: number;
  weekWorkoutsTotal: number;
  onClose: () => void;
}) {
  const muscleSetCounts = new Map<string, number>();
  for (const ex of workout.exercises) {
    const completedSets = ex.sets.filter(s => s.reps !== null && s.reps > 0).length;
    if (completedSets === 0) continue;
    for (const muscle of [...ex.exercise.primaryMuscles, ...ex.exercise.secondaryMuscles]) {
      muscleSetCounts.set(muscle, (muscleSetCounts.get(muscle) ?? 0) + completedSets);
    }
  }
  const muscleSummary = Array.from(muscleSetCounts.entries()).sort((a, b) => b[1] - a[1]);
  const highlightedMuscles = muscleSummary.map(([m]) => m);

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        position: 'fixed',
        inset: 0,
        background: palette.bg,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1300,
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 16px' }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.base, marginBottom: 8 }}>
          Logged · {ordinal(weekWorkoutsCompleted)} of {weekWorkoutsTotal} this week
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
          Workout
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 28, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, color: palette.inkMid, marginBottom: 24 }}>
          {workout.name}
        </div>

        {muscleSummary.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 8 }}>
              Muscles trained
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {muscleSummary.map(([muscle, count]) => (
                <span
                  key={muscle}
                  style={{
                    fontFamily: signalTokens.fontVar.mono,
                    fontSize: 11,
                    background: palette.surface,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 3,
                    padding: '3px 8px',
                    color: palette.inkMid,
                  }}
                >
                  {muscleDisplayName(muscle)} · {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {highlightedMuscles.length > 0 && (
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <MuscleHighlight primaryMuscles={highlightedMuscles} exerciseId={workout.id} alwaysShow />
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: signalTokens.signal.base,
          color: palette.ink,
          border: 'none',
          padding: '18px 24px',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: signalTokens.fontVar.body,
          flexShrink: 0,
        }}
      >
        <span>Done</span>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={palette.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
