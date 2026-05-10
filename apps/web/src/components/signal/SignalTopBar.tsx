'use client';

import { signalTokens, type SignalNavMode } from '@lib/signal/tokens';
import { ForftiWordmark } from './ForftiWordmark';
import { SignalModeSwitch } from './SignalModeSwitch';
import { SignalNotificationsBell } from './SignalNotificationsBell';
import { useSettings } from '@lib/providers/SettingsProvider';

type Props = {
  mode: SignalNavMode;
  hasUnreadNotifications?: boolean;
  showModeSwitch?: boolean;
};

export function SignalTopBar({ mode, hasUnreadNotifications, showModeSwitch: showModeSwitchProp = true }: Props) {
  const { settings, loading } = useSettings();
  const palette = signalTokens.surface.gym;

  const showModeSwitch = showModeSwitchProp && !loading && (settings.coachModeActive || mode === 'coach');

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
      <SignalNotificationsBell hasUnread={hasUnreadNotifications} />
    </header>
  );
}
