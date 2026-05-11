'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppBarProvider } from '@lib/providers/AppBarProvider';
import { useNotifications } from '@lib/providers/NotificationsProvider';
import { SignalAppShell } from './SignalAppShell';
import type { SignalNavMode, SignalSurfaceMode } from '@lib/signal/tokens';

type Props = {
  signalEnabled: boolean;
  userLabel?: string;
  userInitials?: string;
  children: ReactNode;
};

export function SignalShellSwitch({
  signalEnabled,
  userLabel,
  userInitials,
  children,
}: Props) {
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const isCoachDomain = pathname === '/user/coach' || (pathname?.startsWith('/user/coach/') ?? false);

  if (!signalEnabled) {
    return <AppBarProvider>{children}</AppBarProvider>;
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
