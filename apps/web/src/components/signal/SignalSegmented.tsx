'use client';

import { type CSSProperties } from 'react';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

export type SignalSegmentedOption<T extends string | number> = {
  value: T;
  label: string;
  ariaLabel?: string;
};

export interface SignalSegmentedProps<T extends string | number> {
  options: SignalSegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: 'md' | 'sm';
  ariaLabel?: string;
}

export function SignalSegmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel,
}: SignalSegmentedProps<T>) {
  const cellPadding = size === 'sm' ? '6px 0' : '8px 0';
  const cellFontSize = size === 'sm' ? 11 : 12;

  const containerStyle: CSSProperties = {
    display: 'flex',
    width: '100%',
    border: `1px solid ${palette.border}`,
    borderRadius: signalTokens.radii.cell,
    overflow: 'hidden',
    background: palette.surface,
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} style={containerStyle}>
      {options.map((opt, idx) => {
        const active = opt.value === value;
        const cellStyle: CSSProperties = {
          flex: 1,
          appearance: 'none',
          textAlign: 'center',
          padding: cellPadding,
          fontFamily: signalTokens.fontVar.body,
          fontSize: cellFontSize,
          fontWeight: active ? 600 : 500,
          background: active ? palette.ink : 'transparent',
          color: active ? palette.surface : palette.inkMid,
          border: 'none',
          borderLeft: idx === 0 ? 'none' : `1px solid ${palette.border}`,
          cursor: 'pointer',
          minHeight: 32,
        };
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.ariaLabel ?? opt.label}
            onClick={() => onChange(opt.value)}
            style={cellStyle}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
