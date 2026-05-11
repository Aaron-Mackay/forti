import React from 'react';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import AppBarTitle from '@/components/shell/AppBarTitle';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { Box, Paper } from '@mui/material';
import CoachCheckInsClient from './CoachCheckInsClient';

export default async function CoachCheckInsPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <>
      {!signalEnabled && <AppBarTitle title="Client Check-ins" />}
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        <Paper sx={{ minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
          <Box sx={{ px: { xs: 2, sm: 3 } }}>
            <CoachCheckInsClient signalEnabled={signalEnabled} />
          </Box>
        </Paper>
      </SignalSurface>
    </>
  );
}
