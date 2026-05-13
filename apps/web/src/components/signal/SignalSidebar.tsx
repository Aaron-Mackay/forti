'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signalTokens, type SignalNavMode } from '@lib/signal/tokens';
import { SignalBrandMark } from './SignalBrandMark';
import { SignalIcon } from './SignalIcons';
import { SignalModeSwitch } from './SignalModeSwitch';
import { SignalNotificationsBell } from './SignalNotificationsBell';
import { activeNavId, navItemsFor, type NavItemId } from './navItems';
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
  const active = activeOverride ?? activeNavId(items, pathname) ?? 'home';

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
        <div style={{ flex: 1, minWidth: 0 }}>
          <SignalBrandMark size={34} />
        </div>
        <SignalNotificationsBell hasUnread={hasUnreadNotifications} />
      </div>

      {showModeSwitch && (
        <div style={{ padding: '14px 14px 10px' }}>
          <SignalModeSwitch mode={mode} surface="gym" />
        </div>
      )}

      <nav style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
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
            {mode === 'coach' ? 'coach' : 'my training'}
          </div>
        </div>
      </div>
    </aside>
  );
}
