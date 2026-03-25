import React from 'react';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import AppBarTitle from '@/components/AppBarTitle';
import { Paper } from '@mui/material';
import CheckInClient from './CheckInClient';

export default function CheckInPage() {
  return (
    <>
      <AppBarTitle title="Weekly Check-in" />
      <Paper sx={{ px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
        <CheckInClient />
      </Paper>
    </>
  );
}
