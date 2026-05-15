'use client';

import { useState } from 'react';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import type { MetricPrisma } from '@/types/dataTypes';
import type { Settings } from '@/types/settingsTypes';
import { StrengthTab } from './StrengthTab';
import { BodyweightTab } from './bodyweight/BodyweightTab';

type Props = {
  userName: string | null | undefined;
  userId: string;
  metrics: MetricPrisma[];
  settings: Settings;
};

type ProgressTab = 'strength' | 'metrics';

const palette = signalTokens.surface.planning;

export function SignalProgress({ userId, metrics, settings }: Props) {
  const [activeTab, setActiveTab] = useState<ProgressTab>('strength');

  const tabs: { value: ProgressTab; label: string }[] = [
    { value: 'strength', label: 'Strength' },
    { value: 'metrics', label: 'Bodyweight & metrics' },
  ];

  return (
    <div
      className={signalFontVariablesClassName}
      style={{
        minHeight: '100%',
        background: palette.bg,
        color: palette.ink,
        fontFamily: signalTokens.fontVar.body,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* White header: title + tab bar */}
      <div
        style={{
          background: palette.surface,
          borderBottom: `1px solid ${palette.border}`,
          padding: '16px 20px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>
          My training
        </div>
        <div
          style={{
            fontFamily: signalTokens.fontVar.cond,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            lineHeight: 1,
            marginBottom: 14,
          }}
        >
          Progress
        </div>

        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: -1,
          }}
        >
          {tabs.map(({ value, label }) => {
            const active = activeTab === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setActiveTab(value)}
                style={{
                  appearance: 'none',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `2px solid ${palette.ink}` : '2px solid transparent',
                  marginBottom: 0,
                  padding: '6px 14px 10px',
                  cursor: 'pointer',
                  fontFamily: signalTokens.fontVar.body,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? palette.ink : palette.inkMid,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'strength' && (
        <StrengthTab
          exercises={settings.trackedE1rmExercises}
          weightUnit={settings.weightUnit}
        />
      )}

      {activeTab === 'metrics' && (
        <BodyweightTab metrics={metrics} settings={settings} userId={userId} />
      )}
    </div>
  );
}
