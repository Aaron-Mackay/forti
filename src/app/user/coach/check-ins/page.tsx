import React from 'react';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import AppBarTitle from '@/components/AppBarTitle';
import { Paper } from '@mui/material';
import CoachCheckInsClient from './CoachCheckInsClient';

export default function CoachCheckInsPage() {
  return (
    <>
      <AppBarTitle title="Client Check-ins" />
      <Paper sx={{ px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <CoachCheckInsClient />
      </Paper>
    </>
  );
}
