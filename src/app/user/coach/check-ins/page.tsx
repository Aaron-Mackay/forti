import React from 'react';
import CustomAppBar, { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { Paper } from '@mui/material';
import CoachCheckInsClient from './CoachCheckInsClient';

export default function CoachCheckInsPage() {
  return (
    <>
      <CustomAppBar title="Client Check-ins" />
      <Paper sx={{ px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <CoachCheckInsClient />
      </Paper>
    </>
  );
}
