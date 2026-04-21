'use client'

import { createTheme } from '@mui/material/styles';

// Semantic colour constants for use outside of MUI sx props
// (e.g. ApexCharts config, inline CSS-in-JS, SVG styles)
export const PRIMARY_COLOUR = '#1976d2'   // MUI default primary.main
export const SUCCESS_COLOUR = '#2e7d32'   // MUI default success.main
export const DANGER_COLOUR = '#c62828'    // MUI default error.dark

// Anatomy / muscle diagram highlight colours
export const MUSCLE_PRIMARY_COLOUR = '#e8453c'
export const MUSCLE_SECONDARY_COLOUR = '#f5a623'

const theme = createTheme({
  typography: {
    fontFamily: `'Roboto', sans-serif`,
  },
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
