import { signalTokens } from '@lib/signal/tokens';

export function FortiWordmark({
  size = 22,
  color,
  glyphColor,
}: {
  size?: number;
  color?: string;
  glyphColor?: string;
}) {
  const ink = color ?? 'currentColor';
  const accent = glyphColor ?? signalTokens.signal.deep;
  return (
    <span
      style={{
        fontFamily: signalTokens.fontVar.cond,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: '-0.04em',
        color: ink,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 1,
      }}
    >
      <span>For</span>
      <span style={{ color: accent }}>ti</span>
    </span>
  );
}
