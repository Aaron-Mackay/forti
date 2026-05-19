'use client';

import { type CSSProperties, type ReactNode } from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

export interface SignalSectionProps {
  label?: string;
  /** When true, uses a stronger border + base surface (instead of `surfaceAlt`). */
  accent?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  'data-testid'?: string;
}

export function SignalSection({
  label,
  accent,
  children,
  style,
  'data-testid': dataTestId,
}: SignalSectionProps) {
  const sectionStyle: CSSProperties = {
    background: accent ? palette.surface : palette.surfaceAlt,
    border: `1px solid ${accent ? palette.borderStrong : palette.border}`,
    borderRadius: signalTokens.radii.card,
    padding: '12px 14px 14px',
    ...style,
  };

  return (
    <section style={sectionStyle} data-testid={dataTestId}>
      {label ? (
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: signalTokens.signal.deep,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {label}
        </div>
      ) : null}
      {children}
    </section>
  );
}
