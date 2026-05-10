'use client';

import { useRouter } from 'next/navigation';
import { signalTokens, type SignalNavMode, type SignalSurfaceMode } from '@lib/signal/tokens';
import { navigateToMode } from './modeSwitchActions';
import { useSettings } from '@lib/providers/SettingsProvider';

type Props = {
  mode: SignalNavMode;
  surface: SignalSurfaceMode;
};

export function SignalModeSwitch({ mode, surface }: Props) {
  const { settings, loading } = useSettings();
  const router = useRouter();
  const palette = signalTokens.surface[surface];

  if (!loading && !settings.coachModeActive && mode !== 'coach') {
    return null;
  }

  function handleClick(next: SignalNavMode) {
    if (next === mode) return;
    navigateToMode(next, router.push.bind(router));
  }

  const cellBase = {
    flex: 1,
    padding: '6px 12px',
    fontFamily: signalTokens.fontVar.body,
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    borderRadius: signalTokens.radii.cell,
    transition: 'background 120ms ease, color 120ms ease',
  };

  const activeCell = {
    ...cellBase,
    background: palette.ink,
    color: palette.surface,
  };

  const inactiveCell = {
    ...cellBase,
    color: palette.inkMid,
  };

  return (
    <div
      role="group"
      aria-label="Mode"
      style={{
        display: 'flex',
        gap: 2,
        padding: 2,
        background: palette.surfaceAlt,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cell + 1,
        width: '100%',
      }}
    >
      {(['user', 'coach'] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={m === mode}
          onClick={() => handleClick(m)}
          style={m === mode ? activeCell : inactiveCell}
        >
          {m === 'user' ? 'My Training' : 'Coach'}
        </button>
      ))}
    </div>
  );
}
