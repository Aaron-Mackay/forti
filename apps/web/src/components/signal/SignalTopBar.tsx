'use client';

import { signalTokens, type SignalNavMode } from '@lib/signal/tokens';
import { ForftiWordmark } from './ForftiWordmark';
import { SignalIcon } from './SignalIcons';
import { SignalModeSwitch } from './SignalModeSwitch';

type Props = {
  mode: SignalNavMode;
  hasUnreadNotifications?: boolean;
  showModeSwitch?: boolean;
};

export function SignalTopBar({ mode, hasUnreadNotifications, showModeSwitch = true }: Props) {
  const palette = signalTokens.surface.gym;
  return (
    <header
      style={{
        height: signalTokens.space.topBarHeight,
        background: palette.bg,
        color: palette.ink,
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        flexShrink: 0,
        fontFamily: signalTokens.fontVar.body,
      }}
    >
      <ForftiWordmark size={18} color={palette.ink} glyphColor={signalTokens.signal.base} />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {showModeSwitch && (
          <div style={{ maxWidth: 240, width: '100%' }}>
            <SignalModeSwitch mode={mode} surface="gym" />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Notifications"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          display: 'grid',
          placeItems: 'center',
          background: 'transparent',
          border: 'none',
          color: palette.ink,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <SignalIcon name="bell" size={18} color={palette.ink} />
        {hasUnreadNotifications && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: signalTokens.signal.base,
            }}
          />
        )}
      </button>
    </header>
  );
}
