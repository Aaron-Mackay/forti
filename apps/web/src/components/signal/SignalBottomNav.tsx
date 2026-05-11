'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signalTokens, type SignalNavMode } from '@lib/signal/tokens';
import { SignalIcon } from './SignalIcons';
import { activeNavId, navItemsFor, type NavItemId } from './navItems';
import { useSettings } from '@lib/providers/SettingsProvider';

type Props = {
  mode: SignalNavMode;
  activeOverride?: NavItemId;
};

export function SignalBottomNav({ mode, activeOverride }: Props) {
  const palette = signalTokens.surface.gym;
  const pathname = usePathname();
  const { settings, loading } = useSettings();
  const items = navItemsFor(mode, !loading && settings.coachModeActive);
  const active = activeOverride ?? activeNavId(items, pathname) ?? 'home';

  return (
    <nav
      aria-label="Primary"
      style={{
        height: signalTokens.space.bottomNavHeight,
        background: palette.bg,
        color: palette.ink,
        borderTop: `1px solid ${palette.border}`,
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        flexShrink: 0,
        fontFamily: signalTokens.fontVar.body,
      }}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              color: isActive ? palette.ink : palette.inkMid,
              borderTop: `2px solid ${isActive ? signalTokens.signal.base : 'transparent'}`,
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: isActive ? 600 : 500,
              minHeight: 44,
              padding: '4px 0 6px',
            }}
          >
            <SignalIcon name={item.icon} size={20} color={isActive ? palette.ink : palette.inkMid} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
