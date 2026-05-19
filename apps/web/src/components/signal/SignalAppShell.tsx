'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalThemes } from '@lib/signal/theme';
import { signalTokens, type SignalNavMode, type SignalSurfaceMode } from '@lib/signal/tokens';
import { SignalSidebar } from './SignalSidebar';
import { SignalBottomNav } from './SignalBottomNav';
import { SignalTopBar } from './SignalTopBar';
import { SignalSurfaceProvider } from './SignalSurfaceContext';
import { SignalIcon } from './SignalIcons';
import { secondaryNavItemsFor, type NavItemId } from './navItems';
import { useSettings } from '@lib/providers/SettingsProvider';
import { useApiGet } from '@lib/hooks/api/useApiGet';

type Props = {
  mode: SignalNavMode;
  surface?: SignalSurfaceMode;
  activeNavOverride?: NavItemId;
  userLabel?: string;
  userInitials?: string;
  hasUnreadNotifications?: boolean;
  children: React.ReactNode;
};

const DESKTOP_BREAKPOINT_PX = signalTokens.space.desktopBreakpointPx;

export function SignalAppShell({
  mode,
  surface = 'gym',
  activeNavOverride,
  userLabel,
  userInitials,
  hasUnreadNotifications,
  children,
}: Props) {
  const contentPalette = signalTokens.surface[surface];
  const chromePalette = signalTokens.surface.gym;
  const pathname = usePathname();
  const { settings, loading: settingsLoading } = useSettings();
  const { data: coachInfo } = useApiGet<{ currentCoach: { id: string; name: string } | null }>(
    mode === 'user' ? '/api/coach' : null
  );
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const moreLinks = secondaryNavItemsFor(mode, !settingsLoading && settings.showSupplements);
  const hasCoach = mode === 'user' && Boolean(coachInfo?.currentCoach);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [mode, pathname]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMoreOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMoreOpen]);

  return (
    <ThemeProvider theme={signalThemes[surface]}>
      <SignalSurfaceProvider value={surface}>
      <div
        className={signalFontVariablesClassName}
        data-signal-mode={mode}
        data-signal-surface={surface}
        style={{
          height: '100dvh',
          minHeight: '100dvh',
          fontFamily: signalTokens.fontVar.body,
          color: contentPalette.ink,
          background: contentPalette.bg,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <style>{`
          @media (min-width: ${DESKTOP_BREAKPOINT_PX}px) {
            [data-signal-shell-sidebar] {
              display: flex !important;
              position: sticky;
              top: 0;
              align-self: flex-start;
              height: 100dvh;
            }
            [data-signal-shell-mobile-frame] [data-signal-shell-topbar],
            [data-signal-shell-mobile-frame] [data-signal-shell-bottomnav] { display: none !important; }
          }
          @media (max-width: ${DESKTOP_BREAKPOINT_PX - 1}px) {
            [data-signal-shell-sidebar] { display: none !important; }
          }
        `}</style>

        <div data-signal-shell-sidebar style={{ display: 'none' }}>
          <SignalSidebar
            mode={mode}
            activeOverride={activeNavOverride}
            userLabel={userLabel}
            userInitials={userInitials}
            hasUnreadNotifications={hasUnreadNotifications}
            hasCoach={hasCoach}
          />
        </div>

        <div
          data-signal-shell-mobile-frame
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            height: '100dvh',
            minHeight: '100dvh',
            overflow: 'hidden',
          }}
        >
          <div
            data-signal-shell-topbar
            onPointerDown={() => {
              if (mobileMoreOpen) setMobileMoreOpen(false);
            }}
          >
            <SignalTopBar mode={mode} hasUnreadNotifications={hasUnreadNotifications} />
          </div>

          <main
            onPointerDown={() => {
              if (mobileMoreOpen) setMobileMoreOpen(false);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflowY: 'auto',
              background: contentPalette.bg,
              color: contentPalette.ink,
            }}
          >
            {children}
          </main>

          <div data-signal-shell-bottomnav style={{ zIndex: 20, flexShrink: 0 }}>
            <SignalBottomNav
              mode={mode}
              activeOverride={activeNavOverride}
              moreOpen={mobileMoreOpen}
              onMoreToggle={() => setMobileMoreOpen((open) => !open)}
              hasCoach={hasCoach}
            />
            <AnimatePresence initial={false}>
              {mobileMoreOpen && (
                <motion.div
                  id="signal-mobile-more-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    overflow: 'hidden',
                    maxHeight: '42dvh',
                    background: chromePalette.bgAlt,
                    color: chromePalette.ink,
                    borderTop: `1px solid ${chromePalette.border}`,
                    fontFamily: signalTokens.fontVar.body,
                  }}
                >
                  <div
                    style={{
                      maxHeight: '42dvh',
                      overflowY: 'auto',
                      padding: '8px 10px calc(10px + env(safe-area-inset-bottom))',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    {moreLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 10px',
                          border: `1px solid ${chromePalette.border}`,
                          borderRadius: signalTokens.radii.card,
                          background: chromePalette.surface,
                          color: chromePalette.ink,
                          textDecoration: 'none',
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                          <span style={{ display: 'block', marginTop: 2, fontFamily: signalTokens.fontVar.mono, fontSize: 10, color: chromePalette.inkMid }}>
                            {item.detail}
                          </span>
                        </span>
                        <SignalIcon name="arrowRight" size={16} color={signalTokens.signal.base} />
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      </SignalSurfaceProvider>
    </ThemeProvider>
  );
}
