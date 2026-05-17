'use client';

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { signalTokens, type SignalSurfaceMode } from '@lib/signal/tokens';

export type SignalButtonIntent = 'primary' | 'outlined' | 'ghost' | 'urgent';
export type SignalButtonSize = 'sm' | 'md';

export interface SignalButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  intent?: SignalButtonIntent;
  size?: SignalButtonSize;
  surface?: SignalSurfaceMode;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  children?: ReactNode;
}

function styleFor(intent: SignalButtonIntent, size: SignalButtonSize, surface: SignalSurfaceMode): CSSProperties {
  const palette = signalTokens.surface[surface];
  const base: CSSProperties = {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    fontFamily: signalTokens.fontVar.body,
    fontWeight: 600,
    fontSize: 12,
    lineHeight: 1,
    letterSpacing: 0,
    borderRadius: signalTokens.radii.cell,
    padding: size === 'sm' ? '6px 10px' : '8px 14px',
    transition: 'background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out',
    whiteSpace: 'nowrap',
  };

  switch (intent) {
    case 'primary':
      return {
        ...base,
        border: '1px solid transparent',
        background: palette.ink,
        color: palette.surface,
      };
    case 'outlined':
      return {
        ...base,
        border: `1px solid ${palette.ink}`,
        background: 'transparent',
        color: palette.ink,
      };
    case 'ghost':
      return {
        ...base,
        border: `1px solid ${palette.border}`,
        background: 'transparent',
        color: palette.inkMid,
      };
    case 'urgent':
      return {
        ...base,
        border: `1px solid ${signalTokens.status.urgent}`,
        background: 'transparent',
        color: signalTokens.status.urgent,
      };
  }
}

export const SignalButton = forwardRef<HTMLButtonElement, SignalButtonProps>(function SignalButton(
  { intent = 'primary', size = 'md', surface = 'planning', fullWidth, startIcon, endIcon, style, children, disabled, type = 'button', ...rest },
  ref,
) {
  const merged: CSSProperties = {
    ...styleFor(intent, size, surface),
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.5 : undefined,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...style,
  };

  return (
    <button ref={ref} type={type} disabled={disabled} style={merged} {...rest}>
      {startIcon ? <span aria-hidden="true" style={{ display: 'inline-flex' }}>{startIcon}</span> : null}
      {children}
      {endIcon ? <span aria-hidden="true" style={{ display: 'inline-flex' }}>{endIcon}</span> : null}
    </button>
  );
});
