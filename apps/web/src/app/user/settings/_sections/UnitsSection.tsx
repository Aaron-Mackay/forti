'use client';

import { signalTokens } from '@lib/signal/tokens';
import { useSettingsWithSaved } from '../_components/SavedState';
import { SignalSegmented } from '@/components/signal/SignalSegmented';

const palette = signalTokens.surface.planning;

function GroupLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 10,
        color: palette.inkLight,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

export function UnitsSection() {
  const { settings, updateSetting } = useSettingsWithSaved();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <GroupLabel>Exercise weight</GroupLabel>
        <SignalSegmented
          ariaLabel="Exercise weight unit"
          value={settings.weightUnit}
          onChange={(v) => updateSetting('weightUnit', v)}
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lbs', label: 'lbs' },
          ]}
        />
      </div>
      <div>
        <GroupLabel>Bodyweight</GroupLabel>
        <SignalSegmented
          ariaLabel="Bodyweight unit"
          value={settings.bodyweightUnit}
          onChange={(v) => updateSetting('bodyweightUnit', v)}
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
            { value: 'st', label: 'st' },
          ]}
        />
      </div>
    </div>
  );
}
