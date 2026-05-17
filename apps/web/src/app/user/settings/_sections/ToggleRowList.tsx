'use client';

import { type ReactNode } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { SignalToggle } from '@/components/signal/SignalToggle';

const palette = signalTokens.surface.planning;

export type ToggleRow = {
  key: string;
  label: string;
  sublabel?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

export function ToggleRowList({ rows }: { rows: ToggleRow[] }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        background: palette.surface,
        overflow: 'hidden',
      }}
    >
      {rows.map((row, idx) => {
        const labelId = `toggle-row-${row.key}-label`;
        return (
          <div
            key={row.key}
            role="group"
            onClick={() => !row.disabled && row.onChange(!row.checked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '11px 14px',
              borderTop: idx === 0 ? 'none' : `1px solid ${palette.border}`,
              cursor: row.disabled ? 'not-allowed' : 'pointer',
              minHeight: 48,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                id={labelId}
                style={{
                  fontFamily: signalTokens.fontVar.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: palette.ink,
                }}
              >
                {row.label}
              </div>
              {row.sublabel ? (
                <div
                  style={{
                    fontFamily: signalTokens.fontVar.mono,
                    fontSize: 10,
                    color: palette.inkLight,
                    marginTop: 3,
                    letterSpacing: '0.02em',
                  }}
                >
                  {row.sublabel}
                </div>
              ) : null}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <SignalToggle
                checked={row.checked}
                onChange={row.onChange}
                disabled={row.disabled}
                ariaLabelledBy={labelId}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
