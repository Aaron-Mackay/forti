'use client';

import { signalTokens } from '@lib/signal/tokens';
import { useSettingsWithSaved } from '../_components/SavedState';
import { ToggleRowList } from './ToggleRowList';
import { SignalSegmented } from '@/components/signal/SignalSegmented';
import type { Settings } from '@/types/settingsTypes';

const palette = signalTokens.surface.planning;

type ToggleKey = keyof Pick<Settings, 'showStopwatch' | 'showWarmupSuggestions' | 'showPlateCalculator' | 'showSupplements'>;

const TOGGLE_ROWS: { key: ToggleKey; label: string; sublabel: string }[] = [
  { key: 'showStopwatch', label: 'Stopwatch', sublabel: 'Live rest timer between sets.' },
  { key: 'showWarmupSuggestions', label: 'Warmup suggestions', sublabel: 'Auto-generated warmup ramp.' },
  { key: 'showPlateCalculator', label: 'Plate calculator', sublabel: 'Bar loading helper for barbell lifts.' },
  { key: 'showSupplements', label: 'Supplements', sublabel: 'Optional supplements tracker route.' },
];

export function WorkoutDefaultsSection() {
  const { settings, loading, updateSetting } = useSettingsWithSaved();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ToggleRowList
        rows={TOGGLE_ROWS.map((r) => ({
          key: r.key,
          label: r.label,
          sublabel: r.sublabel,
          checked: settings[r.key],
          disabled: loading,
          onChange: (next) => updateSetting(r.key, next),
        }))}
      />

      <div>
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
          Effort metric
        </div>
        <SignalSegmented
          ariaLabel="Effort metric"
          value={settings.effortMetric}
          onChange={(v) => updateSetting('effortMetric', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'rpe', label: 'RPE' },
            { value: 'rir', label: 'RIR' },
          ]}
        />
      </div>
    </div>
  );
}

export function workoutEnabledCount(settings: Settings): { enabled: number; total: number } {
  const total = TOGGLE_ROWS.length;
  const enabled = TOGGLE_ROWS.filter((r) => settings[r.key]).length;
  return { enabled, total };
}
