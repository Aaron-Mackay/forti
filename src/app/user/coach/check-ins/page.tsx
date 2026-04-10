import React from 'react';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import AppBarTitle from '@/components/AppBarTitle';
import { Box, Paper } from '@mui/material';
import CoachCheckInsClient from './CoachCheckInsClient';

export default function CoachCheckInsPage() {
  return (
    <>
      <AppBarTitle title="Client Check-ins" />
      <Paper sx={{ minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <Box sx={{ px: { xs: 2, sm: 3 } }}>
          <CoachCheckInsClient />
        </Box>
      </Paper>
    </>
  );
}
