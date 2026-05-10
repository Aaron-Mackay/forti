'use client';

import type { ReactNode } from 'react';
import { AppBarProvider } from '@lib/providers/AppBarProvider';
import { useNotifications } from '@lib/providers/NotificationsProvider';
import { SignalAppShell } from './SignalAppShell';
import type { SignalNavMode, SignalSurfaceMode } from '@lib/signal/tokens';

type Props = {
  signalEnabled: boolean;
  isCoachDomain: boolean;
  userLabel?: string;
  userInitials?: string;
  children: ReactNode;
};

export function SignalShellSwitch({
  signalEnabled,
  isCoachDomain,
  userLabel,
  userInitials,
  children,
}: Props) {
  const { unreadCount } = useNotifications();

  if (!signalEnabled) {
    return <AppBarProvider isCoachDomain={isCoachDomain}>{children}</AppBarProvider>;
  }

  const mode: SignalNavMode = isCoachDomain ? 'coach' : 'user';
  const surface: SignalSurfaceMode = isCoachDomain ? 'planning' : 'gym';

  return (
    <SignalAppShell
      mode={mode}
      surface={surface}
      userLabel={userLabel}
      userInitials={userInitials}
      hasUnreadNotifications={unreadCount > 0}
    >
      {children}
    </SignalAppShell>
  );
}
