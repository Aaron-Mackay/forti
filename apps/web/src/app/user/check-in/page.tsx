import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import AppBarTitle from '@/components/shell/AppBarTitle';
import { Paper } from '@mui/material';
import CheckInClient from './CheckInClient';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';

export default async function CheckInPage() {
  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="calm">
      <AppBarTitle title="Weekly Check-in" />
      {signalEnabled ? (
        <CheckInClient signalEnabled />
      ) : (
        <Paper sx={{ px: 2, minHeight: HEIGHT_EXC_APPBAR, overflowY: 'auto' }}>
          <CheckInClient />
        </Paper>
      )}
    </SignalSurface>
  );
}
