'use client';

import { type CSSProperties, type ReactNode } from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

export interface SignalSectionCardProps {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  /** Disables the default card frame (border + padding). Use for transparent grouping wrappers. */
  bare?: boolean;
  style?: CSSProperties;
  'data-testid'?: string;
}

export function SignalSectionCard({
  eyebrow,
  title,
  description,
  children,
  bare,
  style,
  'data-testid': dataTestId,
}: SignalSectionCardProps) {
  const sectionStyle: CSSProperties = bare
    ? { ...style }
    : {
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px 16px 16px',
        ...style,
      };

  return (
    <section style={sectionStyle} data-testid={dataTestId}>
      {eyebrow ? (
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: signalTokens.signal.deep,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      {title ? (
        <h2
          style={{
            fontFamily: signalTokens.fontVar.cond,
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.015em',
            color: palette.ink,
            margin: 0,
            marginBottom: description ? 8 : 14,
          }}
        >
          {title}
        </h2>
      ) : null}
      {description ? (
        <p
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: palette.inkMid,
            margin: 0,
            marginBottom: 14,
            maxWidth: 460,
          }}
        >
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}
