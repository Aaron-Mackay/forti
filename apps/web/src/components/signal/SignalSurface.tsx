'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { signalThemes } from '@lib/signal/theme';
import { signalTokens, type SignalSurfaceMode } from '@lib/signal/tokens';

type Props = {
  signalEnabled: boolean;
  surface: SignalSurfaceMode;
  children: ReactNode;
};

export function SignalSurface({ signalEnabled, surface, children }: Props) {
  if (!signalEnabled) return <>{children}</>;
  const palette = signalTokens.surface[surface];
  return (
    <ThemeProvider theme={signalThemes[surface]}>
      <div
        data-signal-surface={surface}
        style={{
          background: palette.bg,
          color: palette.ink,
          minHeight: '100%',
          fontFamily: signalTokens.fontVar.body,
        }}
      >
        {children}
      </div>
    </ThemeProvider>
  );
}
