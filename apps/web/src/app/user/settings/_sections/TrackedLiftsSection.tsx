'use client';

import { useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { useSettingsWithSaved } from '../_components/SavedState';
import { TrackedExercisePickerSheet } from '../_components/TrackedExercisePickerSheet';

const palette = signalTokens.surface.planning;
const MAX = 5;

export function TrackedLiftsSection() {
  const { settings, updateTrackedE1rmExercises } = useSettingsWithSaved();
  const [pickerOpen, setPickerOpen] = useState(false);
  const tracked = settings.trackedE1rmExercises;
  const atMax = tracked.length >= MAX;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {tracked.map((e) => (
        <div
          key={e.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 14px',
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, color: palette.ink }}>{e.name}</span>
          <button
            type="button"
            aria-label={`Remove ${e.name}`}
            onClick={() => updateTrackedE1rmExercises(tracked.filter((t) => t.id !== e.id))}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: palette.inkMid,
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}

      {atMax ? (
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: palette.inkLight,
            padding: '4px 2px',
            letterSpacing: '0.02em',
          }}
        >
          {MAX} / {MAX} tracked
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: `1px dashed ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            cursor: 'pointer',
            padding: '9px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 12,
            color: palette.inkMid,
          }}
        >
          Add lift…
          <span aria-hidden="true">+</span>
        </button>
      )}

      <TrackedExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tracked={tracked}
        onChange={(next) => updateTrackedE1rmExercises(next)}
      />
    </div>
  );
}
