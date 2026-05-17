'use client';

import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

const EXPORTS: { href: string; label: string }[] = [
  { href: '/api/export/training-data', label: 'Training plans' },
  { href: '/api/export/metrics', label: 'Daily metrics' },
  { href: '/api/export/check-ins', label: 'Check-in history' },
];

export function ExportSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {EXPORTS.map((e) => (
        <a
          key={e.href}
          href={e.href}
          download
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '11px 14px',
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            background: palette.surface,
            color: palette.ink,
            textDecoration: 'none',
            fontFamily: signalTokens.fontVar.body,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span>{e.label}</span>
          <span
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              color: palette.inkLight,
              letterSpacing: '0.06em',
            }}
          >
            ↓ csv
          </span>
        </a>
      ))}
    </div>
  );
}
