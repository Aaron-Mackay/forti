'use client';

import { signalTokens } from '@lib/signal/tokens';
import { SignalToggle } from '@/components/signal/SignalToggle';
import type { CoachInfo } from './useCoachAdmin';

const palette = signalTokens.surface.planning;

type Props = {
  info: CoachInfo | null;
  busy: string | null;
  onToggle: (next: boolean) => void;
};

export function CoachModeCard({ info, busy, onToggle }: Props) {
  const checked = info?.coachModeActive ?? false;
  const disabled = !info || busy === 'coach-mode';
  const labelId = 'coach-mode-label';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 14px',
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        background: palette.surface,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          id={labelId}
          style={{
            fontFamily: signalTokens.fontVar.body,
            fontSize: 14,
            fontWeight: 600,
            color: palette.ink,
          }}
        >
          Enable coach features
        </div>
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: palette.inkLight,
            marginTop: 2,
            letterSpacing: '0.02em',
          }}
        >
          Adds the Coach tab to the mode pill, plus the client workspace and invite tools.
        </div>
      </div>
      <SignalToggle
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        ariaLabelledBy={labelId}
      />
    </div>
  );
}
