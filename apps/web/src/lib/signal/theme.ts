'use client';

import { createTheme, type Theme } from '@mui/material/styles';
import { signalTokens, type SignalSurfaceMode } from './tokens';

const surfaceFor = (mode: SignalSurfaceMode) => signalTokens.surface[mode];

const baseComponents = {
  MuiTextField: {
    defaultProps: {
      autoComplete: 'off',
    },
  },
  MuiInputBase: {
    defaultProps: {
      autoComplete: 'off',
      disableInjectingGlobalStyles: true,
    },
  },
  MuiButtonBase: {
    defaultProps: { disableRipple: true },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        fontWeight: 600,
        borderRadius: signalTokens.radii.card,
        letterSpacing: 0,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        borderRadius: signalTokens.radii.cell,
        fontVariantNumeric: 'tabular-nums' as const,
      },
    },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 2,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        minHeight: 40,
        fontWeight: 500,
        letterSpacing: 0,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 11,
        textTransform: 'none' as const,
      },
    },
  },
};

const buildTheme = (mode: SignalSurfaceMode): Theme => {
  const isDark = mode === 'gym';
  const surface = surfaceFor(mode);

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: signalTokens.signal.deep,
        contrastText: surface.ink,
      },
      secondary: {
        main: surface.ink,
        contrastText: surface.surface,
      },
      success: { main: signalTokens.status.ok },
      warning: { main: signalTokens.status.warn },
      error: { main: signalTokens.status.urgent },
      background: {
        default: surface.bg,
        paper: surface.surface,
      },
      text: {
        primary: surface.ink,
        secondary: surface.inkMid,
        disabled: surface.inkLight,
      },
      divider: surface.border,
    },
    shape: { borderRadius: signalTokens.radii.card },
    typography: {
      fontFamily: signalTokens.fontVar.body,
      h1: { fontFamily: signalTokens.fontVar.cond, fontWeight: 700, letterSpacing: '-0.025em' },
      h2: { fontFamily: signalTokens.fontVar.cond, fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontFamily: signalTokens.fontVar.cond, fontWeight: 700, letterSpacing: '-0.015em' },
      h4: { fontFamily: signalTokens.fontVar.cond, fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontFamily: signalTokens.fontVar.cond, fontWeight: 700, letterSpacing: '-0.005em' },
      h6: { fontFamily: signalTokens.fontVar.cond, fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
      overline: {
        fontFamily: signalTokens.fontVar.mono,
        textTransform: 'none',
        letterSpacing: 0,
        fontSize: 11,
        fontWeight: 600,
      },
    },
    components: baseComponents,
  });
};

export const signalThemes: Record<SignalSurfaceMode, Theme> = {
  gym: buildTheme('gym'),
  planning: buildTheme('planning'),
};
