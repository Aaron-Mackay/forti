'use client';

import type { CSSProperties } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { useSignalSurface } from '../SignalSurfaceContext';

type Tone = 'light' | 'dark';

type SkelLineProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  tone?: Tone;
};

type SkelBlockProps = {
  width: number | string;
  height: number;
  radius?: number;
  tone?: Tone;
};

type SkelRowProps = {
  cols: Array<number | string>;
  height?: number;
  gap?: number;
  tone?: Tone;
};

function fillFor(tone: Tone): string {
  return tone === 'dark'
    ? signalTokens.surface.gym.inkGhost
    : signalTokens.surface.planning.border;
}

function useResolvedTone(tone: Tone | undefined): Tone {
  const surface = useSignalSurface();
  return tone ?? (surface === 'gym' ? 'dark' : 'light');
}

export function SkelLine({ width = '60%', height = 12, radius = 2, tone }: SkelLineProps) {
  const resolved = useResolvedTone(tone);
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: fillFor(resolved),
      }}
    />
  );
}

export function SkelBlock({ width, height, radius = 3, tone }: SkelBlockProps) {
  const resolved = useResolvedTone(tone);
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: fillFor(resolved),
      }}
    />
  );
}

export function SkelRow({ cols, height = 12, gap = 14, tone }: SkelRowProps) {
  const resolved = useResolvedTone(tone);
  const trackTemplate = cols
    .map((c) => (typeof c === 'number' ? `${c}px` : c))
    .join(' ');
  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: trackTemplate,
    gap,
    alignItems: 'center',
  };
  const cellStyle: CSSProperties = {
    height,
    borderRadius: 2,
    background: fillFor(resolved),
  };
  return (
    <div aria-hidden="true" style={rowStyle}>
      {cols.map((_, i) => (
        <div key={i} style={cellStyle} />
      ))}
    </div>
  );
}
