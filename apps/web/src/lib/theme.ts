'use client'

import { createTheme } from '@mui/material/styles';

export const colorTokens = {
  brand: {
    primary: '#1976d2',
    primaryStrong: '#1565c0',
  },
  surface: {
    app: '#f8fafc',
    level0: '#ffffff',
    level1: '#f8fafc',
    level2: '#f1f5f9',
    level3: '#e2e8f0',
    borderSubtle: 'rgba(15, 23, 42, 0.08)',
    borderStrong: 'rgba(15, 23, 42, 0.24)',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
  },
  status: {
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    errorStrong: '#c62828',
    info: '#0288d1',
  },
  metric: {
    weight: '#1976d2',
    steps: '#6d4c41',
    sleep: '#5e35b1',
    calories: '#ef6c00',
  },
  macro: {
    calories: '#d32f2f',
    protein: '#0288d1',
    carbs: '#2e7d32',
    fat: '#ed6c02',
  },
  muscle: {
    primary: '#e8453c',
    secondary: '#f5a623',
  },
} as const;

export const spacingTokens = {
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radiiTokens = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const elevationTokens = {
  flat: 'none',
  raised: '0 1px 3px rgba(15, 23, 42, 0.12)',
  floating: '0 8px 24px rgba(15, 23, 42, 0.14)',
  overlay: '0 16px 40px rgba(15, 23, 42, 0.2)',
} as const;

export const motionTokens = {
  duration: {
    instant: 0,
    fast: 120,
    standard: 200,
    slow: 320,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    entrance: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    exit: 'cubic-bezier(0.3, 0, 1, 1)',
  },
} as const;

export const nonMuiTokens = {
  colors: colorTokens,
  spacing: spacingTokens,
  radii: radiiTokens,
  elevation: elevationTokens,
  motion: motionTokens,
} as const;

// Backward-compatible aliases for existing consumers
export const PRIMARY_COLOUR = colorTokens.brand.primary;
export const SUCCESS_COLOUR = colorTokens.status.success;
export const DANGER_COLOUR = colorTokens.status.errorStrong;
export const MUSCLE_PRIMARY_COLOUR = colorTokens.muscle.primary;
export const MUSCLE_SECONDARY_COLOUR = colorTokens.muscle.secondary;

type FortiTokens = typeof nonMuiTokens;

declare module '@mui/material/styles' {
  interface Theme {
    fortiTokens: FortiTokens;
  }

  interface ThemeOptions {
    fortiTokens?: FortiTokens;
  }
}

const theme = createTheme({
  typography: {
    fontFamily: `'Roboto', sans-serif`,
  },
  palette: {
    mode: 'light',
    primary: {
      main: colorTokens.brand.primary,
      dark: colorTokens.brand.primaryStrong,
    },
    success: {
      main: colorTokens.status.success,
    },
    warning: {
      main: colorTokens.status.warning,
    },
    error: {
      main: colorTokens.status.error,
      dark: colorTokens.status.errorStrong,
    },
    info: {
      main: colorTokens.status.info,
    },
    background: {
      default: colorTokens.surface.level1,
      paper: colorTokens.surface.level0,
    },
    text: {
      primary: colorTokens.text.primary,
      secondary: colorTokens.text.secondary,
    },
  },
  shape: {
    borderRadius: radiiTokens.md,
  },
  fortiTokens: nonMuiTokens,
  components: {
    MuiInputBase: {
      defaultProps: {
        disableInjectingGlobalStyles: true,
      },
      styleOverrides: {
        input: {
          '&[type=number]::-webkit-outer-spin-button, &[type=number]::-webkit-inner-spin-button': {
            display: 'none',
          },
          '&[type=number]': {
            MozAppearance: 'textfield',
          },
        },
      },
    },
  },
});

export default theme;
