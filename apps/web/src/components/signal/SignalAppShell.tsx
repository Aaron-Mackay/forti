'use client';

import { ThemeProvider } from '@mui/material/styles';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalThemes } from '@lib/signal/theme';
import { signalTokens, type SignalNavMode, type SignalSurfaceMode } from '@lib/signal/tokens';
import { SignalSidebar } from './SignalSidebar';
import { SignalBottomNav } from './SignalBottomNav';
import { SignalTopBar } from './SignalTopBar';
import { SignalSurfaceProvider } from './SignalSurfaceContext';
import type { NavItemId } from './navItems';

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
          <div data-signal-shell-topbar>
            <SignalTopBar mode={mode} hasUnreadNotifications={hasUnreadNotifications} />
          </div>

          <main
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

          <div
            data-signal-shell-bottomnav
            style={{
              position: 'sticky',
              bottom: 0,
              zIndex: 20,
              flexShrink: 0,
            }}
          >
            <SignalBottomNav mode={mode} activeOverride={activeNavOverride} />
          </div>
        </div>
      </div>
      </SignalSurfaceProvider>
    </ThemeProvider>
  );
}
