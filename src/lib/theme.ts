'use client'

import { createTheme } from '@mui/material/styles';

export const PRIMARY_COLOUR = '#1976d2'

const theme = createTheme({
  typography: {
    fontFamily: `'Roboto', sans-serif`,
  },
  components: {
    MuiInputBase: {
      defaultProps: {
        disableInjectingGlobalStyles: true,
      },
    },
  },
});

export default theme;