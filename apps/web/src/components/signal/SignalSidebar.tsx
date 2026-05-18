'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { signalTokens, type SignalNavMode } from '@lib/signal/tokens';
import { SignalBrandMark } from './SignalBrandMark';
import { FortiWordmark } from './FortiWordmark';
import { SignalIcon } from './SignalIcons';
import { SignalModeSwitch } from './SignalModeSwitch';
import { SignalNotificationsBell } from './SignalNotificationsBell';
import { activeNavId, isSecondaryNavItemActive, navItemsFor, secondaryNavItemsFor, type NavItemId } from './navItems';
import { useSettings } from '@lib/providers/SettingsProvider';

type Props = {
  mode: SignalNavMode;
  activeOverride?: NavItemId;
  userLabel?: string;
  userInitials?: string;
  hasUnreadNotifications?: boolean;
};

export function SignalSidebar({ mode, activeOverride, userLabel, userInitials, hasUnreadNotifications }: Props) {
  const { settings, loading } = useSettings();
  const palette = signalTokens.surface.gym;
  const pathname = usePathname();
  const items = navItemsFor(mode, !loading && settings.coachModeActive);
  const primaryItems = items.filter((item) => item.id !== 'more');
  const active = activeOverride ?? activeNavId(primaryItems, pathname);
  const secondaryItems = secondaryNavItemsFor(mode, !loading && settings.showSupplements);

  const showModeSwitch = !loading && (settings.coachModeActive || mode === 'coach');

  return (
    <aside
      style={{
        width: signalTokens.space.sidebarWidth,
        background: palette.bg,
        color: palette.ink,
        borderRight: `1px solid ${palette.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        fontFamily: signalTokens.fontVar.body,
      }}
    >
      <div
        style={{
          padding: '14px 12px 12px 18px',
          borderBottom: `1px solid ${palette.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <SignalBrandMark size={34} />
          <FortiWordmark size={17} color={palette.ink} />
        </div>
        <SignalNotificationsBell hasUnread={hasUnreadNotifications} />
      </div>

      {showModeSwitch && (
        <div style={{ padding: '14px 14px 10px' }}>
          <SignalModeSwitch mode={mode} surface="gym" />
        </div>
      )}

      <nav style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {primaryItems.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px 10px 13px',
                color: isActive ? palette.ink : palette.inkMid,
                background: isActive ? palette.surface : 'transparent',
                borderLeft: `3px solid ${isActive ? signalTokens.signal.base : 'transparent'}`,
                marginLeft: -3,
                borderRadius: 0,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                fontFamily: signalTokens.fontVar.body,
              }}
            >
              <SignalIcon name={item.icon} size={18} color={isActive ? palette.ink : palette.inkMid} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <div
          aria-hidden
          style={{
            height: 1,
            background: palette.border,
            margin: '12px 8px 8px',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            padding: '0 10px 4px',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: palette.inkLight,
          }}
        >
          {mode === 'coach' ? 'Coach tools' : 'Tools'}
        </div>
        {secondaryItems.map((item) => {
          const isActive = isSecondaryNavItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 10px 8px 13px',
                color: isActive ? palette.ink : palette.inkMid,
                background: isActive ? palette.surface : 'transparent',
                borderLeft: `3px solid ${isActive ? signalTokens.signal.base : 'transparent'}`,
                marginLeft: -3,
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                fontFamily: signalTokens.fontVar.body,
              }}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: '14px 16px',
          borderTop: `1px solid ${palette.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: palette.surfaceAlt,
            border: `1px solid ${palette.border}`,
            display: 'grid',
            placeItems: 'center',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            fontWeight: 600,
            color: palette.ink,
          }}
        >
          {userInitials ?? '·'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              color: palette.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userLabel ?? 'Signed in'}
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: palette.inkLight }}>
            {mode === 'coach' ? 'coach' : 'train'}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label="Sign out"
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            padding: 6,
            cursor: 'pointer',
            color: palette.inkLight,
            display: 'grid',
            placeItems: 'center',
            borderRadius: signalTokens.radii.card,
            flexShrink: 0,
          }}
        >
          <SignalIcon name="signOut" size={16} color={palette.inkLight} />
        </button>
      </div>
    </aside>
  );
}
