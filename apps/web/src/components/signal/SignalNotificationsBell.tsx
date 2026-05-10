'use client';

import Link from 'next/link';
import { signalTokens } from '@lib/signal/tokens';
import { SignalIcon } from './SignalIcons';

type Props = {
  hasUnread?: boolean;
  size?: number;
};

export function SignalNotificationsBell({ hasUnread, size = 18 }: Props) {
  const palette = signalTokens.surface.gym;
  return (
    <Link
      href="/user/notifications"
      aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}
      style={{
        position: 'relative',
        width: 36,
        height: 36,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        color: palette.ink,
        textDecoration: 'none',
        flexShrink: 0,
        borderRadius: signalTokens.radii.cell,
      }}
    >
      <SignalIcon name="bell" size={size} color={palette.ink} />
      {hasUnread && (
        <span
          aria-hidden
          data-signal-notifications-dot
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
    </Link>
  );
}
