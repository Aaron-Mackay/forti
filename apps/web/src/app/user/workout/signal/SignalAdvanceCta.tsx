'use client';

import { signalTokens } from '@lib/signal/tokens';
import { useLongPress } from './useLongPress';

type Props = {
  label: string;
  onAdvance: () => void;
  onSkip: () => void;
  disabled?: boolean;
};

export function SignalAdvanceCta({ label, onAdvance, onSkip, disabled }: Props) {
  const palette = signalTokens.surface.gym;
  const handlers = useLongPress({ onShortPress: onAdvance, onLongPress: onSkip });

  return (
    <div style={{ padding: '12px 16px', background: palette.bg, borderTop: `1px solid ${palette.border}` }}>
      <button
        type="button"
        disabled={disabled}
        aria-label={`${label}. Long-press to skip without logging.`}
        {...handlers}
        style={{
          width: '100%',
          height: 50,
          background: signalTokens.signal.base,
          color: palette.bg,
          border: 'none',
          borderRadius: signalTokens.radii.card,
          fontFamily: signalTokens.fontVar.body,
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }}
      >
        <span>{label}</span>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={palette.bg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      <div style={{ marginTop: 6, textAlign: 'center', fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight, letterSpacing: 0 }}>
        long-press to skip without logging
      </div>
    </div>
  );
}
