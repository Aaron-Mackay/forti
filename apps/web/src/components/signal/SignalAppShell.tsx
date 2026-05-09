'use client';

import { ThemeProvider } from '@mui/material/styles';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalThemes } from '@lib/signal/theme';
import { signalTokens, type SignalNavMode, type SignalSurfaceMode } from '@lib/signal/tokens';
import { SignalSidebar } from './SignalSidebar';
import { SignalBottomNav } from './SignalBottomNav';
import { SignalTopBar } from './SignalTopBar';
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
      <div
        className={signalFontVariablesClassName}
        data-signal-mode={mode}
        data-signal-surface={surface}
        style={{
          minHeight: '100dvh',
          fontFamily: signalTokens.fontVar.body,
          color: contentPalette.ink,
          background: contentPalette.bg,
          display: 'flex',
        }}
      >
        <style>{`
          @media (min-width: ${DESKTOP_BREAKPOINT_PX}px) {
            [data-signal-shell-sidebar] { display: flex !important; }
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
          />
        </div>

        <div
          data-signal-shell-mobile-frame
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: '100dvh',
          }}
        >
          <div data-signal-shell-topbar>
            <SignalTopBar mode={mode} hasUnreadNotifications={hasUnreadNotifications} />
          </div>

          <main
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: 'auto',
              background: contentPalette.bg,
              color: contentPalette.ink,
            }}
          >
            {children}
          </main>

          <div data-signal-shell-bottomnav>
            <SignalBottomNav mode={mode} activeOverride={activeNavOverride} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
