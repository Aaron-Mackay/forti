'use client';

import { useEffect } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import type { PreviousExerciseHistory, E1rmHistoryPoint } from '@lib/contracts/exerciseHistory';
import { formatWeight, type WeightUnit } from '@/lib/units';
import MuscleHighlight from '@/components/fitness/MuscleHighlight';
import E1rmHistorySection from '../E1rmHistorySection';
import { getTodayBestE1rm } from '../exerciseHistoryUtils';
import type { WorkoutExercisePrisma } from '@/types/dataTypes';

type EffectiveUnit = WeightUnit | 'none';

type Props = {
  open: boolean;
  onClose: () => void;
  ex: WorkoutExercisePrisma;
  effectiveUnit: EffectiveUnit;
  previousWorkout: PreviousExerciseHistory | undefined;
  history: E1rmHistoryPoint[] | null;
  formCue: string;
  onFormCueChange: (value: string) => void;
  onFormCueCommit: (value: string) => void;
};

export function SignalExerciseDetailSheet({
  open,
  onClose,
  ex,
  effectiveUnit,
  previousWorkout,
  history,
  formCue,
  onFormCueChange,
  onFormCueCommit,
}: Props) {
  const palette = signalTokens.surface.gym;
  const todayBestE1rm = getTodayBestE1rm(ex);
  const previousWorkouts = previousWorkout?.workouts ?? [];

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={`${ex.exercise.name} details`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.55)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: palette.bg,
          color: palette.ink,
          fontFamily: signalTokens.fontVar.body,
          maxHeight: '88dvh',
          overflowY: 'auto',
          borderTop: `1px solid ${palette.border}`,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: palette.borderStrong, borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 18px 14px', borderBottom: `1px solid ${palette.border}` }}>
          <div>
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginBottom: 4 }}>Exercise detail</div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>{ex.exercise.name}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', color: palette.ink, border: 'none', fontSize: 20, cursor: 'pointer', padding: 8, marginRight: -8 }}>×</button>
        </div>

        <Section title="Notes">
          <textarea
            value={formCue}
            onChange={(e) => onFormCueChange(e.target.value)}
            onBlur={() => onFormCueCommit(formCue)}
            placeholder="Form cues for this exercise…"
            rows={3}
            style={{
              width: '100%',
              background: palette.surface,
              color: palette.ink,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.card,
              padding: '10px 12px',
              fontFamily: signalTokens.fontVar.body,
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </Section>

        <Section title="Progress">
          <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: 10 }}>
            <E1rmHistorySection
              exerciseId={ex.exerciseId}
              history={history}
              todayE1RM={todayBestE1rm}
            />
          </div>
        </Section>

        <Section title="Muscles">
          <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: 14, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 240, aspectRatio: '2 / 1' }}>
              <MuscleHighlight
                primaryMuscles={ex.exercise.primaryMuscles}
                secondaryMuscles={ex.exercise.secondaryMuscles}
                exerciseId={ex.exerciseId}
                filterByQuadrants
              />
            </div>
          </div>
        </Section>

        <Section title="Previous workouts">
          {previousWorkouts.length === 0 ? (
            <div
              style={{
                border: `1px dashed ${palette.border}`,
                borderRadius: signalTokens.radii.card,
                padding: '24px 16px',
                textAlign: 'center',
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 11,
                color: palette.inkLight,
              }}
            >
              No previous workouts yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {previousWorkouts.map((w, i) => (
                <div key={`${w.completedAt ?? 'unknown'}-${i}`} style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: signalTokens.radii.card, padding: 12 }}>
                  <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, marginBottom: 8 }}>
                    {w.completedAt ? new Date(w.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date'}
                    {w.workoutName ? ` · ${w.workoutName}` : ''}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: signalTokens.fontVar.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ color: palette.inkLight }}>
                        <th style={{ padding: '4px 6px', fontWeight: 600, textAlign: 'left' }}>Set</th>
                        <th style={{ padding: '4px 6px', fontWeight: 600, textAlign: 'right' }}>Weight</th>
                        <th style={{ padding: '4px 6px', fontWeight: 600, textAlign: 'right' }}>Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {w.sets.map((s) => (
                        <tr key={s.order} style={{ color: palette.ink }}>
                          <td style={{ padding: '4px 6px' }}>{s.order}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatWeight(s.weight, effectiveUnit === 'none' ? 'kg' : effectiveUnit)}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right' }}>{s.reps ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const palette = signalTokens.surface.gym;
  return (
    <section style={{ padding: '16px 18px', borderBottom: `1px solid ${palette.border}` }}>
      <div
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 11,
          color: palette.inkLight,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}
