'use client';

import { type CSSProperties } from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

export interface SignalToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export function SignalToggle({ checked, onChange, disabled, ariaLabel, ariaLabelledBy }: SignalToggleProps) {
  const trackBg = checked ? signalTokens.signal.base : palette.border;
  const trackBorder = checked ? signalTokens.signal.deep : palette.border;
  const thumbBorder = checked ? signalTokens.signal.deep : palette.borderStrong;
  const thumbLeft = checked ? 13 : 1;

  const trackStyle: CSSProperties = {
    appearance: 'none',
    position: 'relative',
    display: 'inline-block',
    width: 30,
    height: 18,
    borderRadius: 9,
    background: trackBg,
    border: `1px solid ${trackBorder}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'background-color 120ms ease-out, border-color 120ms ease-out',
    opacity: disabled ? 0.5 : 1,
  };

  const thumbStyle: CSSProperties = {
    position: 'absolute',
    top: 1,
    left: thumbLeft,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: palette.surface,
    border: `1px solid ${thumbBorder}`,
    boxSizing: 'border-box',
    transition: 'left 120ms ease-out, border-color 120ms ease-out',
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={trackStyle}
    >
      <span aria-hidden="true" style={thumbStyle} />
    </button>
  );
}
