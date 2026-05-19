'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signalTokens, type SignalNavMode } from '@lib/signal/tokens';
import { SignalIcon } from './SignalIcons';
import { activeNavId, navItemsFor, type NavItemId } from './navItems';

type Props = {
  mode: SignalNavMode;
  activeOverride?: NavItemId;
  moreOpen?: boolean;
  onMoreToggle?: () => void;
  hasCoach?: boolean;
};

export function SignalBottomNav({ mode, activeOverride, moreOpen = false, onMoreToggle, hasCoach = false }: Props) {
  const palette = signalTokens.surface.gym;
  const pathname = usePathname();
  const items = navItemsFor(mode, hasCoach);
  const active = moreOpen ? 'more' : activeOverride ?? activeNavId(items, pathname) ?? 'home';

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
        if (item.id === 'more' && onMoreToggle) {
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-expanded={moreOpen}
              aria-controls="signal-mobile-more-panel"
              onClick={onMoreToggle}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                color: isActive ? palette.ink : palette.inkMid,
                background: 'transparent',
                border: 0,
                borderTop: `2px solid ${isActive ? signalTokens.signal.base : 'transparent'}`,
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                minHeight: 44,
                padding: '4px 0 6px',
                fontFamily: signalTokens.fontVar.body,
                cursor: 'pointer',
              }}
            >
              <SignalIcon name={item.icon} size={20} color={isActive ? palette.ink : palette.inkMid} />
              <span>{item.label}</span>
            </button>
          );
        }
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
